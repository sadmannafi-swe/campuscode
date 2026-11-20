\set ON_ERROR_STOP 1
-- Module quizzes, sequential unlocking, course completion, certificate issuance and the one-time
-- admin bootstrap — exercised against the real seeded C course (9 modules, 9 quizzes).
-- Judge verdicts are inserted as the database owner, exactly like the `submit` Edge Function.

insert into auth.users (id, email, raw_user_meta_data, email_confirmed_at) values
  ('00000000-0000-0000-0000-0000000000e1', 'quiz-s1@test.dev', '{"full_name":"Quiz Student One"}', now()),
  ('00000000-0000-0000-0000-0000000000e2', 'quiz-s2@test.dev', '{"full_name":"Quiz Student Two"}', now()),
  ('00000000-0000-0000-0000-0000000000e3', 'quiz-g1@gmail.test', '{"full_name":"First Google"}', now()),
  ('00000000-0000-0000-0000-0000000000e4', 'quiz-g2@gmail.test', '{"full_name":"Second Google"}', now()),
  ('00000000-0000-0000-0000-0000000000e5', 'quiz-pw@test.dev', '{"full_name":"Password Only"}', now());
insert into auth.identities (user_id, provider, identity_data) values
  ('00000000-0000-0000-0000-0000000000e3', 'google', '{"email":"quiz-g1@gmail.test","email_verified":true}'),
  ('00000000-0000-0000-0000-0000000000e4', 'google', '{"email":"quiz-g2@gmail.test","email_verified":true}'),
  ('00000000-0000-0000-0000-0000000000e5', 'email',  '{"email":"quiz-pw@test.dev","email_verified":true}');

-- Test helpers (session-local).
create function pg_temp.ch(slug text) returns uuid language sql as $$
  select ch.id from public.chapters ch join public.courses c on c.id = ch.course_id where c.slug = 'c-programming' and ch.slug = $1 $$;
create function pg_temp.quiz(slug text) returns uuid language sql as $$
  select id from public.module_quizzes where chapter_id = pg_temp.ch($1) $$;
create function pg_temp.complete_lessons(u uuid, slug text) returns void language sql as $$
  insert into public.lesson_progress (user_id, lesson_id, state)
  select $1, l.id, 'completed' from public.lessons l where l.chapter_id = pg_temp.ch($2)
  on conflict (user_id, lesson_id) do update set state = 'completed' $$;
-- Answers an open attempt as its owner: the first n_mcq MCQs right (rest wrong) and n_code programming
-- problems accepted by the "judge" (rest get a wrong-answer verdict). Call submit in a later statement.
create function pg_temp.answer(attempt uuid, n_mcq int, n_code int) returns void language plpgsql as $$
declare a public.quiz_attempts; qq record; i int := 0; j int := 0; good text; bad text;
begin
  select * into a from public.quiz_attempts where id = attempt;
  perform set_config('request.jwt.claim.sub', a.user_id::text, true);
  for qq in select q.* from public.quiz_questions q where q.quiz_id = a.quiz_id and q.kind = 'mcq' order by q.sort_order loop
    i := i + 1;
    select correct_option into good from public.quiz_answer_keys where question_id = qq.id;
    select o->>'id' into bad from jsonb_array_elements(qq.options) o where o->>'id' <> good limit 1;
    perform public.save_quiz_answer(attempt, qq.id, case when i <= n_mcq then good else bad end);
  end loop;
  for qq in select q.* from public.quiz_questions q where q.quiz_id = a.quiz_id and q.kind = 'code' order by q.sort_order loop
    j := j + 1;
    insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count)
    values (a.user_id, qq.problem_id, 'c', 'test', case when j <= n_code then 'accepted' else 'wrong_answer' end::public.verdict,
            case when j <= n_code then 5 else 2 end, 5);
  end loop;
end $$;
create function pg_temp.pass_module(u uuid, slug text) returns text language plpgsql as $$
declare att uuid;
begin
  perform pg_temp.complete_lessons(u, slug);
  perform set_config('request.jwt.claim.sub', u::text, true);
  att := public.start_quiz_attempt(pg_temp.quiz(slug));
  perform pg_temp.answer(att, 6, 2);
  return att::text;
end $$;

create function pg_temp.submit_open(u uuid) returns text language plpgsql as $$
declare r jsonb;
begin
  perform set_config('request.jwt.claim.sub', u::text, true);
  r := public.submit_quiz_attempt((select id from public.quiz_attempts where user_id = u and status = 'in_progress'));
  if r->>'status' <> 'passed' then raise exception 'FAIL: expected pass, got %', r->>'status'; end if;
  return r->>'status';
end $$;

-- ---------- seeded content shape ----------
do $$ begin
  assert (select count(*) from public.module_quizzes q join public.courses c on c.id = q.course_id where c.slug = 'c-programming') = 9, '9 module quizzes';
  assert not exists (select 1 from public.module_quizzes q
                      where (select count(*) from public.quiz_questions x where x.quiz_id = q.id and x.kind = 'mcq') <> 6
                         or (select count(*) from public.quiz_questions x where x.quiz_id = q.id and x.kind = 'code') <> 2), '6 MCQ + 2 code each';
  assert (select count(*) from public.quiz_answer_keys) = 54, 'every MCQ has a key';
  assert not exists (select 1 from public.problems p join public.quiz_questions q on q.problem_id = p.id where not p.is_quiz_item), 'quiz problems flagged';
  assert not exists (select 1 from public.get_daily_problem() d join public.problems p on p.id = d.id where p.is_quiz_item), 'daily problem never a quiz item';
  assert (public.get_public_counts()->>'problems')::int = (select count(*) from public.problems where status = 'published' and not is_quiz_item), 'public count excludes quiz items';
end $$;

-- ---------- 1. incomplete lessons → quiz locked ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
do $$ declare ov jsonb; begin
  ov := public.get_course_quiz_overview((select id from public.courses where slug = 'c-programming'));
  assert jsonb_array_length(ov) = 9, 'overview lists 9 modules';
  assert ov->0->'quiz'->>'status' = 'locked' and (ov->0->>'unlocked')::boolean, 'M1 open but quiz locked (lessons incomplete)';
  assert ov->1->'quiz'->>'status' = 'locked' and not (ov->1->>'unlocked')::boolean, 'M2 locked';
  begin
    perform public.start_quiz_attempt(pg_temp.quiz('getting-started'));
    raise exception 'FAIL: started a locked quiz';
  exception when raise_exception then
    if sqlerrm <> 'quiz_locked' then raise; end if;
  end;
  -- future module lessons cannot be completed before the previous quiz is passed
  begin
    insert into public.lesson_progress (user_id, lesson_id, state)
    select auth.uid(), l.id, 'completed' from public.lessons l where l.chapter_id = pg_temp.ch('input-and-decisions') limit 1;
    raise exception 'FAIL: completed a lesson in a locked module';
  exception when raise_exception then
    if sqlerrm not like 'module_locked%' then raise; end if;
  end;
  -- quiz content and keys are not readable directly
  assert (select count(*) from public.quiz_questions) = 0, 'questions hidden from students';
  assert (select count(*) from public.quiz_answer_keys) = 0, 'answer keys hidden from students';
  assert not exists (select 1 from public.test_cases t join public.problems p on p.id = t.problem_id
                      where p.is_quiz_item and not t.is_sample), 'hidden quiz tests hidden';
end $$;

-- ---------- 2. lessons complete (as the student, module 1 is unlocked) → quiz available ----------
insert into public.lesson_progress (user_id, lesson_id, state)
select auth.uid(), l.id, 'completed' from public.lessons l where l.chapter_id = pg_temp.ch('getting-started');
do $$ declare st text; att uuid; v jsonb; begin
  st := public.get_course_quiz_overview((select id from public.courses where slug = 'c-programming'))->0->'quiz'->>'status';
  assert st = 'available', 'quiz available after lessons: ' || st;
  att := public.start_quiz_attempt(pg_temp.quiz('getting-started'));
  assert public.start_quiz_attempt(pg_temp.quiz('getting-started')) = att, 'resume the open attempt';
  v := public.get_quiz_attempt(att);
  assert jsonb_array_length(v->'questions') = 8, '8 questions';
  assert v::text not like '%correct_option%' and v::text not like '%is_correct%', 'no answers before submission';
  assert (select count(*) from jsonb_array_elements(v->'questions') q where q->>'kind' = 'mcq' and jsonb_array_length(q->'options') = 4) = 6, 'MCQ options served';
  assert (select count(*) from jsonb_array_elements(v->'questions') q where q->>'kind' = 'code' and q->'problem'->>'slug' like 'quiz-c-m1-%') = 2, 'code problems linked';
  begin
    perform public.save_quiz_answer(att, (select (q->>'id')::uuid from jsonb_array_elements(v->'questions') q where q->>'kind' = 'mcq' limit 1), 'not-an-option');
    raise exception 'FAIL: invalid option accepted';
  exception when invalid_parameter_value then null; end;
end $$;
reset role;

-- ---------- 4/5. 5 of 8 (3 incorrect) → failed ----------
select pg_temp.answer((select id from public.quiz_attempts where user_id = '00000000-0000-0000-0000-0000000000e1' and status = 'in_progress'), 4, 1);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
set role authenticated;
do $$ declare r jsonb; att uuid; begin
  select id into att from public.quiz_attempts where user_id = auth.uid() and status = 'in_progress';
  r := public.submit_quiz_attempt(att);
  assert r->>'status' = 'failed' and (r->>'correct')::int = 5, '5/8 fails: ' || (r->>'correct');
  assert (select count(*) from jsonb_array_elements(r->'questions') q where (q->>'is_correct')::boolean) = 5, 'per-question results';
  assert (select count(*) from jsonb_array_elements(r->'questions') q where q ? 'correct_option') = 6, 'correct answers revealed after submission';
  assert public.submit_quiz_attempt(att)->>'status' = 'failed', 'resubmit is idempotent';
  -- 6. failed → retry available; a fresh attempt is a new shuffle and old verdicts do not carry over
  assert public.get_course_quiz_overview((select id from public.courses where slug = 'c-programming'))->0->'quiz'->>'status' = 'failed', 'status failed';
  assert public.start_quiz_attempt(pg_temp.quiz('getting-started')) <> att, 'new attempt after failing';
  assert exists (select 1 from public.lesson_progress where user_id = auth.uid() and state = 'completed'), 'lesson progress kept after failing';
end $$;
reset role;
-- old accepted submissions (made during the failed attempt) don't count: answer MCQs only
select pg_temp.answer((select id from public.quiz_attempts where user_id = '00000000-0000-0000-0000-0000000000e1' and status = 'in_progress'), 6, 0);
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
set role authenticated;
do $$ declare r jsonb; begin
  r := public.submit_quiz_attempt((select id from public.quiz_attempts where user_id = auth.uid() and status = 'in_progress'));
  assert r->>'status' = 'passed' and (r->>'correct')::int = 6, '8. code questions need a judged accept during the attempt (6 MCQ only = 6/8): ' || (r->>'correct');
end $$;
reset role;

-- ---------- 3. exactly 6/8 → pass (also 7. next module unlocks) ----------
do $$ declare ov jsonb; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', true);
  ov := public.get_course_quiz_overview((select id from public.courses where slug = 'c-programming'));
  assert ov->0->'quiz'->>'status' = 'passed' and (ov->0->'quiz'->>'attempts')::int = 2, 'M1 passed after 2 attempts';
  assert ov->0->'quiz'->'latest'->>'score' = '75.00', 'latest score 75%';
  assert (ov->1->>'unlocked')::boolean, 'M2 unlocked';
  assert not (ov->2->>'unlocked')::boolean, 'M3 still locked';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e1', false);
set role authenticated;
do $$ begin
  insert into public.lesson_progress (user_id, lesson_id, state)
  select auth.uid(), l.id, 'completed' from public.lessons l where l.chapter_id = pg_temp.ch('input-and-decisions') limit 1;
  begin
    perform public.start_quiz_attempt(pg_temp.quiz('getting-started'));
    raise exception 'FAIL: retook a passed quiz';
  exception when raise_exception then if sqlerrm <> 'quiz_already_passed' then raise; end if; end;
  -- 29. students cannot write attempts, answers, completions, or read others' attempts
  begin update public.quiz_attempts set status = 'passed' where user_id = auth.uid();
        raise exception 'FAIL: student edited an attempt';
  exception when insufficient_privilege then null; end;
  begin insert into public.course_completions (user_id, course_id) select auth.uid(), id from public.courses;
        raise exception 'FAIL: student self-completed a course';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ---------- Course completion: student two goes through the whole course ----------
-- 12. an extra mandatory requirement (a required practice problem) is configured for the course
insert into public.course_requirement_problems (course_id, problem_id, kind)
select c.id, p.id, 'practice' from public.courses c, public.problems p where c.slug = 'c-programming' and p.slug = 'sum-of-two-numbers';

-- one module at a time: lessons → start → answer/judge (one transaction) → submit (next transaction)
select format($f$select pg_temp.pass_module('00000000-0000-0000-0000-0000000000e2', %L)$f$, slug),
       $f$select pg_temp.submit_open('00000000-0000-0000-0000-0000000000e2')$f$
  from (values (1, 'getting-started'), (2, 'input-and-decisions'), (3, 'loops'), (4, 'arrays'), (5, 'functions'),
               (6, 'strings'), (7, 'structures-and-pointers'), (8, 'files-and-preprocessor')) s(n, slug) order by n
\gexec
-- 11. eight of nine quizzes passed → not completed
do $$ begin
  assert not exists (select 1 from public.course_completions where user_id = '00000000-0000-0000-0000-0000000000e2'), '8/9 quizzes → not complete';
end $$;
-- 10. module 9: all quizzes would need its lessons — leave one lesson incomplete → quiz locked → not complete
insert into public.lesson_progress (user_id, lesson_id, state)
select '00000000-0000-0000-0000-0000000000e2', l.id, 'completed' from public.lessons l where l.chapter_id = pg_temp.ch('projects') and l.number = 31;
do $$ begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
  assert (public.course_requirement_status('00000000-0000-0000-0000-0000000000e2', (select id from public.courses where slug = 'c-programming'))->'lessons'->>'done')::int = 31, '31/32 lessons';
  assert public.get_course_quiz_overview((select id from public.courses where slug = 'c-programming'))->8->'quiz'->>'status' = 'locked', 'M9 quiz locked until lessons done';
  assert not exists (select 1 from public.course_completions where user_id = '00000000-0000-0000-0000-0000000000e2'), 'incomplete lessons → not complete';
end $$;
select pg_temp.pass_module('00000000-0000-0000-0000-0000000000e2', 'projects');
do $$ declare r jsonb; begin
  perform set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', true);
  r := public.submit_quiz_attempt((select id from public.quiz_attempts where user_id = '00000000-0000-0000-0000-0000000000e2' and status = 'in_progress'));
  assert r->>'status' = 'passed', 'M9 passed';
  -- 12. all lessons + 9 quizzes, but the required practice problem is unsolved → not complete
  assert not exists (select 1 from public.course_completions where user_id = '00000000-0000-0000-0000-0000000000e2'), 'other mandatory requirement pending → not complete';
  assert not exists (select 1 from public.certificates where user_id = '00000000-0000-0000-0000-0000000000e2'), 'no certificate yet';
end $$;
-- 13/14. the judge accepts the practice problem → completion recorded automatically, certificate queued
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count)
select '00000000-0000-0000-0000-0000000000e2', id, 'c', 'x', 'accepted', 6, 6 from public.problems where slug = 'sum-of-two-numbers';
do $$ declare cc public.course_completions; c public.certificates; begin
  select * into cc from public.course_completions where user_id = '00000000-0000-0000-0000-0000000000e2';
  assert found and cc.completed_at is not null and (cc.snapshot->'quizzes'->>'passed')::int = 9, 'course completed with timestamp';
  select * into c from public.certificates where user_id = '00000000-0000-0000-0000-0000000000e2';
  assert found and c.status = 'valid' and c.pdf_path is null, 'certificate queued (pending PDF)';
  assert c.student_name = 'Quiz Student Two' and c.course_title = 'C Programming', 'printed name/course';
  assert not exists (select 1 from public.notifications where user_id = c.user_id and kind = 'certificate'), 'not announced before the PDF exists';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e2', false);
set role authenticated;
do $$ declare p record; begin
  select * into p from public.get_course_progress() where course_id = (select id from public.courses where slug = 'c-programming');
  assert p.completed = 32 and p.total = 32 and p.quizzes_passed = 9 and p.quizzes_total = 9 and p.completed_at is not null, '100% with completion timestamp';
end $$;
reset role;

-- 16. repeated completion events → no duplicates
do $$ begin
  perform public.process_course_completion('00000000-0000-0000-0000-0000000000e2', (select id from public.courses where slug = 'c-programming'));
  perform public.try_issue_certificate('00000000-0000-0000-0000-0000000000e2', (select id from public.courses where slug = 'c-programming'));
  perform public.reconcile_certificates();
  assert (select count(*) from public.course_completions where user_id = '00000000-0000-0000-0000-0000000000e2') = 1, 'one completion';
  assert (select count(*) from public.certificates where user_id = '00000000-0000-0000-0000-0000000000e2') = 1, 'one certificate';
end $$;

-- 23. PDF generation failure → safe retry, same record
do $$ declare cid uuid; r jsonb; begin
  select id into cid from public.certificates where user_id = '00000000-0000-0000-0000-0000000000e2';
  assert public.claim_certificate_render(cid), 'renderer claims the job';
  update public.certificates set pdf_error = 'simulated failure', pdf_render_started_at = null where id = cid;   -- what the function does on failure
  r := public.reconcile_certificates();
  assert (r->>'pdf_retries')::int >= 1, 'reconciler retries pending PDFs';
  assert (select pdf_attempts from public.certificates where id = cid) = 1 and (select pdf_path from public.certificates where id = cid) is null, 'still pending, one record';
  -- a later attempt stores the PDF → issued exactly once
  update public.certificates set pdf_path = user_id || '/' || certificate_number || '.pdf', pdf_generated_at = now(), issued_at = now() where id = cid;
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000e2' and kind = 'certificate') = 1, 'notified once on issue';
  assert (select status from public.verify_certificate((select verification_token from public.certificates where id = cid))) = 'valid', 'issued certificate verifies';
end $$;

-- ---------- Admin bootstrap ----------
-- 25. ordinary signups never become admin (fixtures above created five users)
do $$ begin
  assert not exists (select 1 from public.admin_identity), 'no admin before setup';
  assert not exists (select 1 from public.user_roles where role = 'admin'), 'no admin role rows';
  assert not public.is_admin('00000000-0000-0000-0000-0000000000e1'), 'first student is not admin';
  assert (public.admin_setup_state()) = '{"claimed": false}'::jsonb, 'setup state: unclaimed';
end $$;
set role authenticated;
-- a password-only account cannot claim (no verified Google identity)
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e5', false);
do $$ begin
  begin perform public.claim_initial_admin(); raise exception 'FAIL: unverified claim';
  exception when insufficient_privilege then if sqlerrm <> 'admin_requires_verified_google' then raise; end if; end;
end $$;
-- 24. first verified Google account through the setup flow → admin
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e3', false);
do $$ begin
  assert (public.claim_initial_admin()->>'claimed')::boolean, 'claimed';
  assert public.is_admin(), 'first verified account is admin';
  assert (select count(*) from public.admin_quiz_stats()) = 9, 'admin sees quiz stats';
  assert (select count(*) from public.admin_list_quiz_attempts()) >= 11, 'admin sees attempts';
  assert (public.get_quiz_attempt((select id from public.quiz_attempts where user_id = '00000000-0000-0000-0000-0000000000e1' order by started_at limit 1))->>'status') = 'failed', 'admin reviews any attempt';
  begin perform public.admin_set_role('00000000-0000-0000-0000-0000000000e4', 'admin', true);
        raise exception 'FAIL: admin granted a second admin';
  exception when insufficient_privilege then null; end;
end $$;
-- 26/27. a second verified Google account cannot claim and is not admin
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e4', false);
do $$ begin
  begin perform public.claim_initial_admin(); raise exception 'FAIL: second admin';
  exception when insufficient_privilege then if sqlerrm <> 'admin_already_claimed' then raise; end if; end;
  assert not public.is_admin(), 'second Google account denied';
  assert (public.admin_setup_state()) = '{"claimed": true}'::jsonb, 'setup state reveals nothing but claimed';
  -- 29/30. students cannot touch roles, the admin slot, admin RPCs or other students' attempts
  begin insert into public.admin_identity (user_id, email) values (auth.uid(), 'x'); raise exception 'FAIL: wrote admin_identity';
  exception when insufficient_privilege then null; end;
  begin insert into public.user_roles (user_id, role) values (auth.uid(), 'admin'); raise exception 'FAIL: self-assigned role';
  exception when insufficient_privilege then null; end;
  begin perform * from public.admin_quiz_stats(); raise exception 'FAIL: student read quiz stats';
  exception when insufficient_privilege then null; end;
  begin perform * from public.admin_list_certificates(); raise exception 'FAIL: student listed certificates';
  exception when insufficient_privilege then null; end;
  begin perform public.get_quiz_attempt((select id from public.quiz_attempts limit 1)); raise exception 'FAIL: read another attempt';
  exception when no_data_found then null; end;
  assert (select count(*) from public.quiz_attempts) = 0, 'no other students attempts visible';
end $$;
-- 28. the original admin keeps access
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000e3', false);
do $$ begin assert public.is_admin(), 'original admin allowed'; end $$;
reset role;
do $$ begin
  begin insert into public.admin_identity (singleton, user_id, email) values (true, '00000000-0000-0000-0000-0000000000e4', 'x');
        raise exception 'FAIL: second admin row';
  exception when unique_violation then null; end;
  begin perform public.bootstrap_admin('quiz-g2@gmail.test'); raise exception 'FAIL: legacy bootstrap still works';
  exception when insufficient_privilege then null; end;
end $$;

-- cleanup
delete from public.course_requirement_problems where problem_id = (select id from public.problems where slug = 'sum-of-two-numbers');
delete from public.certificates where user_id in (select id from auth.users where email like 'quiz-%');
delete from public.admin_identity;
delete from auth.users where email like 'quiz-%';
select 'quiz, completion and admin tests passed' as result;
