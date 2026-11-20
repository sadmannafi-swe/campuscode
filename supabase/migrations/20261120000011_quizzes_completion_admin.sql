-- =====================================================================
-- CampusCode — Module quizzes, sequential unlocking, course completion,
-- "issued only after the PDF is stored", reconciliation, and the
-- one-time administrator bootstrap (/ccadmingo).
--
-- Trust model (unchanged): the browser never sends a score, a completion
-- flag or a role. Quiz MCQ answers are graded against keys students cannot
-- read; programming questions count only when the judge (service role)
-- recorded an *accepted* submission during the attempt.
-- =====================================================================

-- ---------- Quiz programming problems stay out of the public catalogue ----
alter table public.problems add column if not exists is_quiz_item boolean not null default false;
create index if not exists problems_quiz_item_idx on public.problems (is_quiz_item) where is_quiz_item;

create or replace function public.get_daily_problem()
returns table (id uuid, slug text, title text, title_bn text, difficulty public.difficulty, topic_id uuid)
language sql stable security invoker set search_path = public
as $$
  select p.id, p.slug, p.title, p.title_bn, p.difficulty, p.topic_id
  from public.problems p
  where p.status = 'published' and p.is_official and not p.is_quiz_item
  order by md5(p.id::text || public.activity_today()::text)
  limit 1;
$$;

create or replace function public.get_public_counts()
returns json language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'problems', (select count(*) from public.problems where status = 'published' and not is_quiz_item),
    'lessons',  (select count(*) from public.lessons where is_published)
  );
$$;

-- Quiz items are assessments, not catalogue problems: they don't inflate "problems solved".
create or replace function public.recompute_user_counts(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.user_stats us set
    problems_solved = (
      select count(*) from public.user_problem_progress upp
      join public.problems p on p.id = upp.problem_id
      where upp.user_id = p_user and upp.solved_at is not null
        and p.status = 'published' and not p.is_quiz_item and p.author_id is distinct from p_user),
    lessons_completed = (
      select count(*) from public.lesson_progress lp
      where lp.user_id = p_user and lp.state = 'completed'),
    updated_at = now()
  where us.user_id = p_user;
end $$;

-- =====================================================================
-- QUIZ SCHEMA
-- =====================================================================
create type public.quiz_question_kind  as enum ('mcq', 'code');
create type public.quiz_attempt_status as enum ('in_progress', 'passed', 'failed');

-- One quiz per module (chapter).
create table public.module_quizzes (
  id               uuid primary key default gen_random_uuid(),
  course_id        uuid not null,
  chapter_id       uuid not null unique,
  title_en         text not null,
  title_bn         text not null,
  pass_min_correct smallint not null default 6 check (pass_min_correct >= 1),
  is_published     boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  foreign key (chapter_id, course_id) references public.chapters (id, course_id) on delete cascade
);
create index module_quizzes_course_idx on public.module_quizzes (course_id);
create trigger module_quizzes_updated_at before update on public.module_quizzes
  for each row execute function public.set_updated_at();

create table public.quiz_questions (
  id          uuid primary key default gen_random_uuid(),
  quiz_id     uuid not null references public.module_quizzes (id) on delete cascade,
  key         text not null unique check (key ~ '^[a-z0-9-]{3,40}$'),
  kind        public.quiz_question_kind not null,
  sort_order  int not null default 0,
  prompt      text not null check (char_length(prompt) between 3 and 2000),
  code        text check (code is null or char_length(code) <= 5000),
  options     jsonb,              -- [{ "id": "…", "text": "…" }] for MCQs; ids are content hashes
  problem_id  uuid references public.problems (id) on delete restrict,
  explanation text not null default '',
  created_at  timestamptz not null default now(),
  constraint quiz_question_shape check (
    (kind = 'mcq'  and jsonb_typeof(options) = 'array' and jsonb_array_length(options) between 2 and 6 and problem_id is null) or
    (kind = 'code' and problem_id is not null and options is null))
);
create index quiz_questions_quiz_idx on public.quiz_questions (quiz_id, sort_order);

-- Correct options live apart from the questions; students can never read this table.
create table public.quiz_answer_keys (
  question_id    uuid primary key references public.quiz_questions (id) on delete cascade,
  correct_option text not null
);

create table public.quiz_attempts (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users (id) on delete cascade,
  quiz_id        uuid not null references public.module_quizzes (id) on delete cascade,
  status         public.quiz_attempt_status not null default 'in_progress',
  question_order uuid[] not null,
  option_order   jsonb not null default '{}'::jsonb,   -- { question_id: [option ids in display order] }
  started_at     timestamptz not null default now(),
  submitted_at   timestamptz,
  correct_count  smallint,
  total_count    smallint,
  score          numeric(5,2),
  constraint quiz_attempt_result check (
    (status = 'in_progress' and submitted_at is null) or
    (status <> 'in_progress' and submitted_at is not null and correct_count is not null and total_count is not null))
);
-- At most one open attempt and at most one passed attempt per student and quiz.
create unique index quiz_attempts_one_open   on public.quiz_attempts (user_id, quiz_id) where status = 'in_progress';
create unique index quiz_attempts_one_passed on public.quiz_attempts (user_id, quiz_id) where status = 'passed';
create index quiz_attempts_user_idx on public.quiz_attempts (user_id, quiz_id, started_at desc);
create index quiz_attempts_quiz_idx on public.quiz_attempts (quiz_id, status, submitted_at desc);

create table public.quiz_attempt_answers (
  attempt_id      uuid not null references public.quiz_attempts (id) on delete cascade,
  question_id     uuid not null references public.quiz_questions (id) on delete cascade,
  selected_option text,
  submission_id   uuid references public.submissions (id) on delete set null,
  is_correct      boolean,
  answered_at     timestamptz not null default now(),
  primary key (attempt_id, question_id)
);

-- Trusted record that a student finished a course (written only by process_course_completion()).
create table public.course_completions (
  user_id      uuid not null references auth.users (id) on delete cascade,
  course_id    uuid not null references public.courses (id) on delete cascade,
  completed_at timestamptz not null default now(),
  snapshot     jsonb not null default '{}'::jsonb,
  primary key (user_id, course_id)
);
create index course_completions_course_idx on public.course_completions (course_id, completed_at desc);

-- =====================================================================
-- MODULE UNLOCKING
-- =====================================================================
-- A module is unlocked when every earlier module of the course that has a published quiz has been
-- passed by the student. Modules without quizzes never lock anything (e.g. the Python course).
create or replace function public.chapter_unlocked(p_user uuid, p_chapter uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((
    select not exists (
      select 1
        from public.chapters prev
        join public.module_quizzes q on q.chapter_id = prev.id and q.is_published
       where prev.course_id = ch.course_id and prev.is_published and prev.sort_order < ch.sort_order
         and not exists (select 1 from public.quiz_attempts a
                          where a.user_id = p_user and a.quiz_id = q.id and a.status = 'passed'))
      from public.chapters ch where ch.id = p_chapter), false);
$$;

create or replace function public.chapter_lesson_counts(p_user uuid, p_chapter uuid, out done int, out total int)
language sql stable security definer set search_path = public
as $$
  select count(lp.lesson_id) filter (where lp.state = 'completed')::int, count(l.id)::int
    from public.lessons l
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = p_user
   where l.chapter_id = p_chapter and l.is_published;
$$;

-- The caller's own unlock state (lets the invoker-rights guard below ask without exposing other users).
create or replace function public.my_chapter_unlocked(p_chapter uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.chapter_unlocked(auth.uid(), p_chapter) $$;

-- Lessons of a locked module can be read but not marked completed.
create or replace function public.guard_lesson_unlocked()
returns trigger language plpgsql set search_path = public
as $$
begin
  if public.is_trusted_caller() then return new; end if;
  if new.state = 'completed' and (tg_op = 'INSERT' or old.state is distinct from 'completed') then
    -- RLS already restricts students to their own rows (user_id = auth.uid()).
    if not public.my_chapter_unlocked((select chapter_id from public.lessons where id = new.lesson_id)) then
      raise exception 'module_locked: pass the previous module quiz to unlock this module.' using errcode = 'P0001';
    end if;
  end if;
  return new;
end $$;
create trigger lesson_progress_unlock_guard before insert or update on public.lesson_progress
  for each row execute function public.guard_lesson_unlocked();

-- =====================================================================
-- QUIZ STATUS & ATTEMPTS (all grading on the server)
-- =====================================================================
create or replace function public.quiz_status_for(p_user uuid, p_quiz uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  q public.module_quizzes;
  lc record;
  unlocked boolean;
  open_attempt uuid;
  passed_at timestamptz;
  latest public.quiz_attempts;
  n_attempts int;
  st text;
begin
  select * into q from public.module_quizzes where id = p_quiz;
  if not found then return null; end if;
  select * into lc from public.chapter_lesson_counts(p_user, q.chapter_id);
  unlocked := public.chapter_unlocked(p_user, q.chapter_id);
  select submitted_at into passed_at from public.quiz_attempts where user_id = p_user and quiz_id = p_quiz and status = 'passed';
  select id into open_attempt from public.quiz_attempts where user_id = p_user and quiz_id = p_quiz and status = 'in_progress';
  select * into latest from public.quiz_attempts where user_id = p_user and quiz_id = p_quiz and status <> 'in_progress'
   order by submitted_at desc limit 1;
  select count(*) into n_attempts from public.quiz_attempts where user_id = p_user and quiz_id = p_quiz and status <> 'in_progress';

  st := case
    when passed_at is not null then 'passed'
    when not unlocked or lc.done < lc.total or not q.is_published then 'locked'
    when open_attempt is not null then 'in_progress'
    when latest.status = 'failed' then 'failed'
    else 'available' end;

  return jsonb_build_object(
    'quiz_id', q.id, 'chapter_id', q.chapter_id, 'title_en', q.title_en, 'title_bn', q.title_bn,
    'status', st, 'module_unlocked', unlocked,
    'lessons_done', lc.done, 'lessons_total', lc.total,
    'question_count', (select count(*) from public.quiz_questions where quiz_id = q.id),
    'pass_min_correct', q.pass_min_correct,
    'attempts', n_attempts, 'open_attempt_id', open_attempt, 'passed_at', passed_at,
    'latest', case when latest.id is null then null else jsonb_build_object(
      'attempt_id', latest.id, 'status', latest.status, 'correct', latest.correct_count,
      'total', latest.total_count, 'score', latest.score, 'submitted_at', latest.submitted_at) end);
end $$;

-- Per-module status for the signed-in student (every published chapter, with or without a quiz).
create or replace function public.get_course_quiz_overview(p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare me uuid := auth.uid();
begin
  if me is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'chapter_id', ch.id, 'chapter_slug', ch.slug, 'sort_order', ch.sort_order,
             'unlocked', public.chapter_unlocked(me, ch.id),
             'quiz', case when q.id is null then null else public.quiz_status_for(me, q.id) end)
           order by ch.sort_order)
      from public.chapters ch
      left join public.module_quizzes q on q.chapter_id = ch.id and q.is_published
     where ch.course_id = p_course and ch.is_published), '[]'::jsonb);
end $$;

create or replace function public.start_quiz_attempt(p_quiz uuid)
returns uuid language plpgsql volatile security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  q public.module_quizzes;
  st jsonb;
  v_id uuid;
  v_order uuid[];
  v_opts jsonb;
begin
  if me is null then raise exception 'auth_required' using errcode = '42501'; end if;
  if not public.is_active_user(me) then raise exception 'account_suspended' using errcode = '42501'; end if;
  select * into q from public.module_quizzes where id = p_quiz and is_published;
  if not found then raise exception 'quiz_not_found' using errcode = 'P0002'; end if;

  st := public.quiz_status_for(me, p_quiz);
  if st->>'status' = 'passed' then raise exception 'quiz_already_passed' using errcode = 'P0001'; end if;
  if st->>'status' = 'locked' then raise exception 'quiz_locked' using errcode = 'P0001'; end if;
  if st->>'open_attempt_id' is not null then return (st->>'open_attempt_id')::uuid; end if;

  -- Fresh shuffle of question order and of every MCQ's options.
  select array_agg(id order by random()) into v_order from public.quiz_questions where quiz_id = p_quiz;
  if v_order is null then raise exception 'quiz_has_no_questions' using errcode = 'P0001'; end if;
  select coalesce(jsonb_object_agg(qq.id, (select jsonb_agg(o->>'id' order by random()) from jsonb_array_elements(qq.options) o)), '{}'::jsonb)
    into v_opts from public.quiz_questions qq where qq.quiz_id = p_quiz and qq.kind = 'mcq';

  insert into public.quiz_attempts (user_id, quiz_id, question_order, option_order)
  values (me, p_quiz, v_order, v_opts)
  on conflict (user_id, quiz_id) where status = 'in_progress' do nothing
  returning id into v_id;
  if v_id is null then
    select id into v_id from public.quiz_attempts where user_id = me and quiz_id = p_quiz and status = 'in_progress';
  end if;
  return v_id;
end $$;

-- The latest judged submission of a quiz problem made during an attempt (display + grading source).
create or replace function public.quiz_code_evaluation(p_user uuid, p_problem uuid, p_from timestamptz, p_to timestamptz)
returns jsonb language sql stable security definer set search_path = public
as $$
  select jsonb_build_object(
    'accepted', exists (select 1 from public.submissions s where s.user_id = p_user and s.problem_id = p_problem
                          and s.verdict = 'accepted' and s.created_at >= p_from and s.created_at <= p_to),
    'latest', (select jsonb_build_object('submission_id', s.id, 'verdict', s.verdict, 'passed', s.passed_count,
                                         'total', s.total_count, 'created_at', s.created_at)
                 from public.submissions s
                where s.user_id = p_user and s.problem_id = p_problem and s.created_at >= p_from and s.created_at <= p_to
                order by (s.verdict = 'accepted') desc, s.created_at desc limit 1),
    'attempts', (select count(*) from public.submissions s where s.user_id = p_user and s.problem_id = p_problem
                   and s.created_at >= p_from and s.created_at <= p_to));
$$;

-- Attempt view for its owner (or an admin). Answers and keys appear only after submission.
create or replace function public.get_quiz_attempt(p_attempt uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a public.quiz_attempts;
  q public.module_quizzes;
  done boolean;
  qs jsonb := '[]'::jsonb;
  qq public.quiz_questions;
  ans public.quiz_attempt_answers;
  prob record;
  item jsonb;
  opts jsonb;
  key text;
begin
  select * into a from public.quiz_attempts where id = p_attempt;
  if not found or (a.user_id is distinct from me and not public.is_admin(me)) then
    raise exception 'attempt_not_found' using errcode = 'P0002';
  end if;
  select * into q from public.module_quizzes where id = a.quiz_id;
  done := a.status <> 'in_progress';

  for i in 1 .. coalesce(array_length(a.question_order, 1), 0) loop
    select * into qq from public.quiz_questions where id = a.question_order[i];
    continue when not found;
    select * into ans from public.quiz_attempt_answers where attempt_id = a.id and question_id = qq.id;
    item := jsonb_build_object('id', qq.id, 'number', i, 'kind', qq.kind, 'prompt', qq.prompt, 'code', qq.code);
    if qq.kind = 'mcq' then
      select coalesce(jsonb_agg(jsonb_build_object('id', oid, 'text',
                (select o->>'text' from jsonb_array_elements(qq.options) o where o->>'id' = oid)) order by ord), '[]'::jsonb)
        into opts
        from jsonb_array_elements_text(coalesce(a.option_order->(qq.id::text), (select jsonb_agg(o->'id') from jsonb_array_elements(qq.options) o)))
             with ordinality as t(oid, ord);
      item := item || jsonb_build_object('options', opts, 'selected', ans.selected_option);
      if done then
        select correct_option into key from public.quiz_answer_keys where question_id = qq.id;
        item := item || jsonb_build_object('correct_option', key, 'is_correct', coalesce(ans.is_correct, false), 'explanation', qq.explanation);
      end if;
    else
      select id, slug, title, title_bn into prob from public.problems where id = qq.problem_id;
      item := item || jsonb_build_object(
        'problem', jsonb_build_object('id', prob.id, 'slug', prob.slug, 'title', prob.title, 'title_bn', prob.title_bn),
        'evaluation', public.quiz_code_evaluation(a.user_id, qq.problem_id, a.started_at, coalesce(a.submitted_at, now())));
      if done then item := item || jsonb_build_object('is_correct', coalesce(ans.is_correct, false), 'explanation', qq.explanation); end if;
    end if;
    qs := qs || jsonb_build_array(item);
  end loop;

  return jsonb_build_object(
    'id', a.id, 'status', a.status, 'started_at', a.started_at, 'submitted_at', a.submitted_at,
    'correct', a.correct_count, 'total', coalesce(a.total_count, array_length(a.question_order, 1)), 'score', a.score,
    'quiz', jsonb_build_object('id', q.id, 'title_en', q.title_en, 'title_bn', q.title_bn, 'pass_min_correct', q.pass_min_correct,
                               'chapter_id', q.chapter_id, 'course_id', q.course_id,
                               'chapter_slug', (select slug from public.chapters where id = q.chapter_id),
                               'course_slug', (select slug from public.courses where id = q.course_id)),
    'questions', qs);
end $$;

-- Saves one MCQ choice while the attempt is open (so nothing is lost when visiting the IDE).
create or replace function public.save_quiz_answer(p_attempt uuid, p_question uuid, p_option text)
returns void language plpgsql volatile security definer set search_path = public
as $$
declare a public.quiz_attempts; qq public.quiz_questions;
begin
  select * into a from public.quiz_attempts where id = p_attempt for update;
  if not found or a.user_id is distinct from auth.uid() then raise exception 'attempt_not_found' using errcode = 'P0002'; end if;
  if a.status <> 'in_progress' then raise exception 'attempt_closed' using errcode = 'P0001'; end if;
  select * into qq from public.quiz_questions where id = p_question and quiz_id = a.quiz_id and kind = 'mcq';
  if not found then raise exception 'question_not_in_attempt' using errcode = 'P0001'; end if;
  if p_option is not null and not exists (select 1 from jsonb_array_elements(qq.options) o where o->>'id' = p_option) then
    raise exception 'invalid_option' using errcode = '22023';
  end if;
  insert into public.quiz_attempt_answers (attempt_id, question_id, selected_option)
  values (a.id, qq.id, p_option)
  on conflict (attempt_id, question_id) do update set selected_option = excluded.selected_option, answered_at = now();
end $$;

-- Grades the whole attempt. MCQs: against the hidden keys. Programming: only an accepted judge
-- submission made during this attempt counts. Pass = correct ≥ pass_min_correct (6 of 8).
create or replace function public.submit_quiz_attempt(p_attempt uuid, p_answers jsonb default null)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  a public.quiz_attempts;
  q public.module_quizzes;
  qq public.quiz_questions;
  sel text;
  ok boolean;
  ev jsonb;
  n_correct int := 0;
  n_total int := 0;
  k text;
begin
  select * into a from public.quiz_attempts where id = p_attempt for update;
  if not found or a.user_id is distinct from me then raise exception 'attempt_not_found' using errcode = 'P0002'; end if;
  if a.status <> 'in_progress' then return public.get_quiz_attempt(p_attempt); end if;   -- idempotent
  select * into q from public.module_quizzes where id = a.quiz_id;

  if p_answers is not null then
    for k in select jsonb_object_keys(p_answers) loop
      perform public.save_quiz_answer(p_attempt, k::uuid, nullif(p_answers->>k, ''));
    end loop;
  end if;

  for qq in select * from public.quiz_questions where id = any (a.question_order) loop
    n_total := n_total + 1;
    if qq.kind = 'mcq' then
      select selected_option into sel from public.quiz_attempt_answers where attempt_id = a.id and question_id = qq.id;
      ok := sel is not null and sel = (select correct_option from public.quiz_answer_keys where question_id = qq.id);
      insert into public.quiz_attempt_answers (attempt_id, question_id, selected_option, is_correct)
      values (a.id, qq.id, sel, ok)
      on conflict (attempt_id, question_id) do update set is_correct = excluded.is_correct;
    else
      ev := public.quiz_code_evaluation(me, qq.problem_id, a.started_at, now());
      ok := (ev->>'accepted')::boolean;
      insert into public.quiz_attempt_answers (attempt_id, question_id, submission_id, is_correct)
      values (a.id, qq.id, nullif(ev #>> '{latest,submission_id}', '')::uuid, ok)
      on conflict (attempt_id, question_id) do update set submission_id = excluded.submission_id, is_correct = excluded.is_correct;
    end if;
    if ok then n_correct := n_correct + 1; end if;
  end loop;

  update public.quiz_attempts
     set status = case when n_correct >= q.pass_min_correct then 'passed'::public.quiz_attempt_status else 'failed' end,
         submitted_at = now(), correct_count = n_correct, total_count = n_total,
         score = round(100.0 * n_correct / greatest(n_total, 1), 2)
   where id = a.id;

  if n_correct >= q.pass_min_correct then
    perform public.try_issue_certificate(me, q.course_id);   -- course completion + certificate, if now due
  end if;
  return public.get_quiz_attempt(p_attempt);
end $$;

-- =====================================================================
-- COURSE COMPLETION (trusted) — integrates with the certificate system
-- =====================================================================
create or replace function public.course_requirement_status(p_user uuid, p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  s public.course_certificate_settings;
  l_done int; l_total int; q_passed int; q_total int; p_done int; p_total int;
  score numeric; attempted int; a_total int; pass numeric;
  verified boolean; complete boolean;
begin
  select * into s from public.course_certificate_settings where course_id = p_course;
  pass := coalesce(s.passing_score, 70);

  select count(lp.lesson_id) filter (where lp.state = 'completed'), count(l.id) into l_done, l_total
    from public.lessons l join public.chapters ch on ch.id = l.chapter_id and ch.is_published
    left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = p_user
   where l.course_id = p_course and l.is_published;

  select count(*) filter (where exists (select 1 from public.quiz_attempts a where a.user_id = p_user and a.quiz_id = q.id and a.status = 'passed')),
         count(*) into q_passed, q_total
    from public.module_quizzes q join public.chapters ch on ch.id = q.chapter_id and ch.is_published
   where q.course_id = p_course and q.is_published;

  select count(*) filter (where upp.solved_at is not null), count(*) into p_done, p_total
    from public.course_requirement_problems r
    join public.problems p on p.id = r.problem_id and p.status = 'published'
    left join public.user_problem_progress upp on upp.problem_id = r.problem_id and upp.user_id = p_user
   where r.course_id = p_course and r.kind = 'practice';

  with req as (
    select r.problem_id, r.weight from public.course_requirement_problems r
      join public.problems p on p.id = r.problem_id and p.status = 'published'
     where r.course_id = p_course and r.kind = 'assessment'
  ), best as (
    select s2.problem_id, max(s2.passed_count::numeric / s2.total_count) as ratio
      from public.submissions s2 join req on req.problem_id = s2.problem_id
     where s2.user_id = p_user and s2.total_count > 0 group by s2.problem_id
  )
  select case when sum(req.weight) > 0 then 100 * sum(req.weight * coalesce(best.ratio, 0)) / sum(req.weight) end,
         count(best.problem_id), count(req.problem_id)
    into score, attempted, a_total
    from req left join best on best.problem_id = req.problem_id;

  -- Lesson completion is self-reported, so a course can only be "completed" when it also has at least
  -- one server-verified requirement: module quizzes and/or a judged final assessment.
  verified := q_total > 0 or a_total > 0;
  complete := verified and l_total > 0 and l_done = l_total and q_passed = q_total and p_done = p_total
              and (a_total = 0 or (score is not null and score >= pass));

  return jsonb_build_object(
    'complete', complete, 'has_verified_requirement', verified,
    'lessons', jsonb_build_object('done', l_done, 'total', l_total),
    'quizzes', jsonb_build_object('passed', q_passed, 'total', q_total),
    'practice', jsonb_build_object('done', p_done, 'total', p_total),
    'assessment', jsonb_build_object('score', case when score is null then null else trunc(score, 2) end, 'passing_score', pass,
                                     'attempted', attempted, 'total', a_total,
                                     'passed', a_total = 0 or (score is not null and score >= pass)));
end $$;

create or replace function public.course_certificate_config(p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  s public.course_certificate_settings; c public.courses;
  n_lessons int; n_quizzes int; n_practice int; n_assessment int;
  missing text[] := '{}';
begin
  select * into c from public.courses where id = p_course;
  if not found then return null; end if;
  select * into s from public.course_certificate_settings where course_id = p_course;
  select count(*) into n_lessons from public.lessons l join public.chapters ch on ch.id = l.chapter_id
   where l.course_id = p_course and l.is_published and ch.is_published;
  select count(*) into n_quizzes from public.module_quizzes q join public.chapters ch on ch.id = q.chapter_id
   where q.course_id = p_course and q.is_published and ch.is_published;
  select count(*) filter (where r.kind = 'practice'), count(*) filter (where r.kind = 'assessment') into n_practice, n_assessment
    from public.course_requirement_problems r join public.problems p on p.id = r.problem_id and p.status = 'published'
   where r.course_id = p_course;
  if s.course_id is null or not s.enabled then missing := array_append(missing, 'certificates_disabled'); end if;
  if not c.is_published then missing := array_append(missing, 'course_unpublished'); end if;
  if n_lessons = 0 then missing := array_append(missing, 'no_published_lessons'); end if;
  if n_quizzes = 0 and n_assessment = 0 then missing := array_append(missing, 'no_verified_requirement'); end if;
  return jsonb_build_object('course_id', p_course, 'configured', cardinality(missing) = 0, 'missing', to_jsonb(missing),
    'enabled', coalesce(s.enabled, false), 'passing_score', coalesce(s.passing_score, 70), 'issuer_designation', s.issuer_designation,
    'lessons', n_lessons, 'quizzes', n_quizzes, 'practice', n_practice, 'assessment', n_assessment);
end $$;

create or replace function public.certificate_eligibility(p_user uuid, p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare cfg jsonb; req jsonb; prof public.profiles; name_ok boolean; account_ok boolean; completed timestamptz;
begin
  cfg := public.course_certificate_config(p_course);
  if cfg is null then return null; end if;
  req := public.course_requirement_status(p_user, p_course);
  select * into prof from public.profiles where id = p_user;
  account_ok := found and prof.status = 'active';
  name_ok := found and char_length(btrim(prof.full_name)) between 1 and 80;
  select completed_at into completed from public.course_completions where user_id = p_user and course_id = p_course;
  return req || jsonb_build_object(
    'course_id', p_course, 'configured', (cfg->>'configured')::boolean, 'missing_config', cfg->'missing',
    'account_active', account_ok, 'name_present', name_ok, 'course_completed_at', completed,
    'eligible', (cfg->>'configured')::boolean and (req->>'complete')::boolean and account_ok and name_ok);
end $$;

-- Records completion (idempotent), then issues the certificate if the course awards one.
create or replace function public.process_course_completion(p_user uuid, p_course uuid)
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare req jsonb;
begin
  req := public.course_requirement_status(p_user, p_course);
  if (req->>'complete')::boolean then
    insert into public.course_completions (user_id, course_id, snapshot) values (p_user, p_course, req)
    on conflict (user_id, course_id) do nothing;
    perform public.issue_certificate_if_eligible(p_user, p_course);
  end if;
  return req;
end $$;

create or replace function public.try_issue_certificate(p_user uuid, p_course uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.process_course_completion(p_user, p_course);
exception when others then
  raise warning 'course completion / certificate failed for % / %: %', p_user, p_course, sqlerrm;
  insert into public.certificate_events (user_id, course_id, event, details)
  values (p_user, p_course, 'issue_failed', jsonb_build_object('error', sqlerrm, 'sqlstate', sqlstate));
end $$;

-- Course progress for the caller: lessons and quizzes, plus the trusted completion record.
drop function if exists public.get_course_progress();
create function public.get_course_progress()
returns table (course_id uuid, total int, completed int, last_lesson_id uuid,
               quizzes_total int, quizzes_passed int, completed_at timestamptz)
language sql stable security invoker set search_path = public
as $$
  select c.id,
         (select count(*)::int from public.lessons l where l.course_id = c.id),
         (select count(*)::int from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
           where l.course_id = c.id and lp.user_id = auth.uid() and lp.state = 'completed'),
         (select lp2.lesson_id from public.lesson_progress lp2 join public.lessons l2 on l2.id = lp2.lesson_id
           where lp2.user_id = auth.uid() and l2.course_id = c.id order by lp2.updated_at desc limit 1),
         (select count(*)::int from public.module_quizzes q where q.course_id = c.id and q.is_published),
         (select count(*)::int from public.quiz_attempts a join public.module_quizzes q on q.id = a.quiz_id
           where q.course_id = c.id and q.is_published and a.user_id = auth.uid() and a.status = 'passed'),
         (select cc.completed_at from public.course_completions cc where cc.course_id = c.id and cc.user_id = auth.uid())
  from public.courses c;
$$;
grant execute on function public.get_course_progress() to anon, authenticated;

-- =====================================================================
-- CERTIFICATES: issued only after the PDF is stored
-- =====================================================================
alter table public.certificates add column if not exists pdf_attempts int not null default 0;
alter table public.certificate_events drop constraint if exists certificate_events_event_check;
alter table public.certificate_events add constraint certificate_events_event_check
  check (event in ('queued', 'issued', 'pdf_generated', 'pdf_failed', 'revoked', 'issue_failed'));

-- Creates the certificate record (pending until its PDF exists) and queues rendering. No notification yet.
create or replace function public.issue_certificate_if_eligible(p_user uuid, p_course uuid)
returns uuid language plpgsql volatile security definer set search_path = public
as $$
declare v_id uuid; e jsonb; prof public.profiles; crs public.courses; cfg public.course_certificate_settings;
begin
  if p_user is null or p_course is null then return null; end if;
  select id into v_id from public.certificates where user_id = p_user and course_id = p_course;
  if found then return v_id; end if;
  perform pg_advisory_xact_lock(hashtextextended('certificate:' || p_user::text || ':' || p_course::text, 0));
  select id into v_id from public.certificates where user_id = p_user and course_id = p_course;
  if found then return v_id; end if;

  e := public.certificate_eligibility(p_user, p_course);
  if e is null or not (e->>'eligible')::boolean then return null; end if;
  select * into prof from public.profiles where id = p_user;
  select * into crs  from public.courses  where id = p_course;
  select * into cfg  from public.course_certificate_settings where course_id = p_course;

  for attempt in 1..6 loop
    begin
      insert into public.certificates (user_id, course_id, certificate_number, verification_token,
                                       student_name, course_title, issuer_designation, final_score)
      values (p_user, p_course, public.certificate_random_number(), public.certificate_random_token(),
              btrim(prof.full_name), crs.title_en, nullif(btrim(cfg.issuer_designation), ''),
              coalesce((e #>> '{assessment,score}')::numeric,
                       (select round(avg(a.score), 2) from public.quiz_attempts a join public.module_quizzes q on q.id = a.quiz_id
                         where a.user_id = p_user and q.course_id = p_course and a.status = 'passed'), 100))
      on conflict (user_id, course_id) do nothing
      returning id into v_id;
      exit;
    exception when unique_violation then
      if attempt = 6 then raise; end if;
    end;
  end loop;
  if v_id is null then
    select id into v_id from public.certificates where user_id = p_user and course_id = p_course;
    return v_id;
  end if;
  insert into public.certificate_events (certificate_id, user_id, course_id, event, details)
  values (v_id, p_user, p_course, 'queued', jsonb_build_object('eligibility', e));
  perform public.request_certificate_pdf(v_id);
  return v_id;
end $$;

-- The moment the PDF is stored the certificate is issued: log it and notify the student exactly once.
create or replace function public.on_certificate_pdf_stored()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if old.pdf_path is null and new.pdf_path is not null and new.status = 'valid' then
    insert into public.certificate_events (certificate_id, user_id, course_id, event, details)
    values (new.id, new.user_id, new.course_id, 'issued', jsonb_build_object('pdf_path', new.pdf_path, 'issued_at', new.issued_at));
    insert into public.notifications (user_id, kind, title, body, link)
    values (new.user_id, 'certificate', 'Certificate earned: ' || new.course_title,
            'Congratulations! Your Certificate of Completion is ready to view and download.', '/profile#certificates');
  end if;
  return new;
end $$;
create trigger certificates_pdf_stored after update of pdf_path on public.certificates
  for each row execute function public.on_certificate_pdf_stored();

create or replace function public.claim_certificate_render(p_certificate uuid)
returns boolean language plpgsql volatile security definer set search_path = public
as $$
begin
  update public.certificates
     set pdf_render_started_at = now(), pdf_attempts = pdf_attempts + 1
   where id = p_certificate and pdf_path is null and status = 'valid'
     and (pdf_render_started_at is null or pdf_render_started_at < now() - interval '90 seconds');
  return found;
end $$;

-- Only issued (PDF stored) certificates verify publicly.
create or replace function public.verify_certificate(p_token text)
returns table (status text, student_name text, course_title text, certificate_number text,
               issued_at timestamptz, issuing_platform text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{32}$' then
    return query select 'not_found'::text, null::text, null::text, null::text, null::timestamptz, 'CampusCode'::text;
    return;
  end if;
  return query
    select c.status::text, c.student_name, c.course_title, c.certificate_number, c.issued_at, 'CampusCode'::text
      from public.certificates c where c.verification_token = p_token and c.pdf_path is not null;
  if not found then
    return query select 'not_found'::text, null::text, null::text, null::text, null::timestamptz, 'CampusCode'::text;
  end if;
end $$;

-- Background safety net: retries pending PDFs and catches completions whose triggering event failed.
create or replace function public.reconcile_certificates()
returns jsonb language plpgsql volatile security definer set search_path = public
as $$
declare r record; n_pdf int := 0; n_done int := 0;
begin
  for r in
    select id from public.certificates
     where status = 'valid' and pdf_path is null and pdf_attempts < 25
       and (pdf_render_started_at is null or pdf_render_started_at < now() - interval '2 minutes')
     order by created_at limit 25
  loop
    perform public.request_certificate_pdf(r.id); n_pdf := n_pdf + 1;
  end loop;
  for r in
    select distinct x.user_id, x.course_id from (
      select a.user_id, q.course_id from public.quiz_attempts a join public.module_quizzes q on q.id = a.quiz_id
       where a.status = 'passed' and a.submitted_at > now() - interval '3 days'
      union
      select lp.user_id, l.course_id from public.lesson_progress lp join public.lessons l on l.id = lp.lesson_id
       where lp.state = 'completed' and lp.updated_at > now() - interval '3 days') x
     where not exists (select 1 from public.course_completions cc where cc.user_id = x.user_id and cc.course_id = x.course_id)
        or not exists (select 1 from public.certificates c where c.user_id = x.user_id and c.course_id = x.course_id)
     limit 500
  loop
    perform public.try_issue_certificate(r.user_id, r.course_id); n_done := n_done + 1;
  end loop;
  return jsonb_build_object('pdf_retries', n_pdf, 'completion_checks', n_done);
end $$;

do $cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    create extension if not exists pg_cron;
    if exists (select 1 from cron.job where jobname = 'campuscode-certificate-reconcile') then
      perform cron.unschedule('campuscode-certificate-reconcile');
    end if;
    perform cron.schedule('campuscode-certificate-reconcile', '*/5 * * * *', 'select public.reconcile_certificates()');
  end if;
end $cron$;

-- =====================================================================
-- ONE-TIME ADMINISTRATOR BOOTSTRAP (/ccadmingo)
-- =====================================================================
-- Exactly one row can ever exist: the primary key is a constant TRUE.
create table public.admin_identity (
  singleton  boolean primary key default true check (singleton),
  user_id    uuid not null unique references auth.users (id) on delete restrict,
  email      text not null,
  claimed_at timestamptz not null default now()
);
alter table public.admin_identity enable row level security;   -- no policies: only definer functions touch it
revoke all on public.admin_identity from anon, authenticated;

-- Administrator = the claimed identity. Nothing else (no role table row, no email, no client flag).
create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public
as $$
  select p_user is not null and exists (select 1 from public.admin_identity where user_id = p_user);
$$;

-- Older role rows no longer confer anything; keep the table consistent with the single admin.
delete from public.user_roles where role = 'admin'
  and user_id not in (select user_id from public.admin_identity);

create or replace function public.admin_setup_state()
returns jsonb language sql stable security definer set search_path = public
as $$ select jsonb_build_object('claimed', exists (select 1 from public.admin_identity)); $$;

-- The first verified Google account to complete the setup flow becomes the only administrator.
create or replace function public.claim_initial_admin()
returns jsonb language plpgsql volatile security definer set search_path = public, auth
as $$
declare me uuid := auth.uid(); u record; verified boolean; n int;
begin
  if me is null then raise exception 'auth_required' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_identity) then
    raise exception 'admin_already_claimed' using errcode = '42501';
  end if;
  select id, email, email_confirmed_at into u from auth.users where id = me;
  verified := u.email_confirmed_at is not null and exists (
    select 1 from auth.identities i
     where i.user_id = me and i.provider = 'google'
       and coalesce((i.identity_data->>'email_verified')::boolean, false)
       and lower(i.identity_data->>'email') = lower(u.email));
  if not verified then raise exception 'admin_requires_verified_google' using errcode = '42501'; end if;
  if not public.is_active_user(me) then raise exception 'account_suspended' using errcode = '42501'; end if;

  insert into public.admin_identity (singleton, user_id, email) values (true, me, lower(u.email))
  on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'admin_already_claimed' using errcode = '42501'; end if;
  insert into public.user_roles (user_id, role, granted_by) values (me, 'admin', me) on conflict do nothing;
  return jsonb_build_object('claimed', true);
end $$;

-- Roles can no longer be granted from the dashboard; the administrator is fixed by the bootstrap.
create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_grant boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  raise exception 'CampusCode has a single administrator, set once through /ccadmingo. Roles cannot be granted or removed here.'
    using errcode = '42501';
end $$;

create or replace function public.bootstrap_admin(p_email text)
returns text language plpgsql security definer set search_path = public
as $$
begin
  raise exception 'Disabled: the administrator is claimed once through the /ccadmingo setup flow.' using errcode = '42501';
end $$;

-- =====================================================================
-- ADMIN: quiz management
-- =====================================================================
create or replace function public.admin_quiz_stats()
returns table (quiz_id uuid, course_title text, module_number int, chapter_title text, quiz_title text,
               attempts bigint, students bigint, passed_students bigint, failed_attempts bigint, avg_score numeric)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  return query
  select q.id, c.title_en, ch.sort_order, ch.title_en, q.title_en,
         count(a.id) filter (where a.status <> 'in_progress'),
         count(distinct a.user_id),
         count(distinct a.user_id) filter (where a.status = 'passed'),
         count(a.id) filter (where a.status = 'failed'),
         round(avg(a.score) filter (where a.status <> 'in_progress'), 1)
    from public.module_quizzes q
    join public.courses c on c.id = q.course_id
    join public.chapters ch on ch.id = q.chapter_id
    left join public.quiz_attempts a on a.quiz_id = q.id
   group by q.id, c.title_en, c.sort_order, ch.sort_order, ch.title_en, q.title_en
   order by c.sort_order, ch.sort_order;
end $$;

create or replace function public.admin_list_quiz_attempts(
  p_search text default '', p_quiz uuid default null, p_status public.quiz_attempt_status default null,
  p_limit int default 25, p_offset int default 0)
returns table (id uuid, user_id uuid, username text, full_name text, quiz_id uuid, quiz_title text, status public.quiz_attempt_status,
               correct_count smallint, total_count smallint, score numeric, started_at timestamptz, submitted_at timestamptz,
               attempt_number bigint, code_correct int, total_count_rows bigint)
language plpgsql stable security definer set search_path = public
as $$
declare s text := btrim(coalesce(p_search, ''));
begin
  perform public.assert_admin();
  return query
  select a.id, a.user_id, p.username, p.full_name, a.quiz_id, q.title_en, a.status, a.correct_count, a.total_count, a.score,
         a.started_at, a.submitted_at,
         row_number() over (partition by a.user_id, a.quiz_id order by a.started_at),
         (select count(*)::int from public.quiz_attempt_answers x join public.quiz_questions qq on qq.id = x.question_id
           where x.attempt_id = a.id and qq.kind = 'code' and x.is_correct),
         count(*) over ()
    from public.quiz_attempts a
    join public.module_quizzes q on q.id = a.quiz_id
    left join public.profiles p on p.id = a.user_id
   where (s = '' or p.username ilike '%' || s || '%' or p.full_name ilike '%' || s || '%')
     and (p_quiz is null or a.quiz_id = p_quiz)
     and (p_status is null or a.status = p_status)
   order by a.started_at desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

-- =====================================================================
-- PRIVILEGES & RLS
-- =====================================================================
alter table public.module_quizzes       enable row level security;
alter table public.quiz_questions       enable row level security;
alter table public.quiz_answer_keys     enable row level security;
alter table public.quiz_attempts        enable row level security;
alter table public.quiz_attempt_answers enable row level security;
alter table public.course_completions   enable row level security;

create policy "module quizzes: read published" on public.module_quizzes
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "module quizzes: admin write" on public.module_quizzes
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Questions are served only through get_quiz_attempt(); keys never leave the database for students.
revoke all on public.quiz_questions, public.quiz_answer_keys from anon, authenticated;
grant select on public.quiz_questions, public.quiz_answer_keys to authenticated;
create policy "quiz questions: admin read" on public.quiz_questions for select to authenticated using ((select public.is_admin()));
create policy "quiz keys: admin read" on public.quiz_answer_keys for select to authenticated using ((select public.is_admin()));

revoke all on public.quiz_attempts, public.quiz_attempt_answers, public.course_completions from anon, authenticated;
grant select on public.quiz_attempts, public.course_completions to authenticated;
grant select (attempt_id, question_id, selected_option, is_correct, answered_at) on public.quiz_attempt_answers to authenticated;
create policy "quiz attempts: read own" on public.quiz_attempts for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "quiz answers: read own" on public.quiz_attempt_answers for select to authenticated
  using (exists (select 1 from public.quiz_attempts a where a.id = attempt_id
                  and (a.user_id = (select auth.uid()) or (select public.is_admin()))));
create policy "course completions: read own" on public.course_completions for select to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

-- Internal helpers: triggers / service role only.
revoke all on function public.chapter_unlocked(uuid, uuid)                       from public, anon, authenticated;
revoke all on function public.chapter_lesson_counts(uuid, uuid)                  from public, anon, authenticated;
revoke all on function public.guard_lesson_unlocked()                            from public, anon, authenticated;
revoke all on function public.my_chapter_unlocked(uuid)                          from public, anon;
grant execute on function public.my_chapter_unlocked(uuid)                       to authenticated;
revoke all on function public.quiz_status_for(uuid, uuid)                        from public, anon, authenticated;
revoke all on function public.quiz_code_evaluation(uuid, uuid, timestamptz, timestamptz) from public, anon, authenticated;
revoke all on function public.course_requirement_status(uuid, uuid)              from public, anon, authenticated;
revoke all on function public.process_course_completion(uuid, uuid)              from public, anon, authenticated;
revoke all on function public.on_certificate_pdf_stored()                        from public, anon, authenticated;
revoke all on function public.reconcile_certificates()                           from public, anon, authenticated;
revoke all on function public.claim_certificate_render(uuid)                     from public, anon, authenticated;
grant execute on function public.process_course_completion(uuid, uuid) to service_role;
grant execute on function public.reconcile_certificates()             to service_role;
grant execute on function public.claim_certificate_render(uuid)       to service_role;

-- Student RPCs (each derives the user from auth.uid()).
revoke all on function public.get_course_quiz_overview(uuid)       from public, anon;
revoke all on function public.start_quiz_attempt(uuid)             from public, anon;
revoke all on function public.get_quiz_attempt(uuid)               from public, anon;
revoke all on function public.save_quiz_answer(uuid, uuid, text)   from public, anon;
revoke all on function public.submit_quiz_attempt(uuid, jsonb)     from public, anon;
grant execute on function public.get_course_quiz_overview(uuid)     to authenticated;
grant execute on function public.start_quiz_attempt(uuid)           to authenticated;
grant execute on function public.get_quiz_attempt(uuid)             to authenticated;
grant execute on function public.save_quiz_answer(uuid, uuid, text) to authenticated;
grant execute on function public.submit_quiz_attempt(uuid, jsonb)   to authenticated;

-- Admin bootstrap.
revoke all on function public.admin_setup_state()   from public;
revoke all on function public.claim_initial_admin() from public, anon;
grant execute on function public.admin_setup_state()   to anon, authenticated;
grant execute on function public.claim_initial_admin() to authenticated;

revoke all on function public.admin_quiz_stats() from public, anon;
revoke all on function public.admin_list_quiz_attempts(text, uuid, public.quiz_attempt_status, int, int) from public, anon;
grant execute on function public.admin_quiz_stats() to authenticated;
grant execute on function public.admin_list_quiz_attempts(text, uuid, public.quiz_attempt_status, int, int) to authenticated;
