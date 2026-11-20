-- =====================================================================
-- CampusCode — trusted business logic
-- Everything that affects stats, streaks, achievements, solved counts
-- or roles runs here, inside the database, never in the browser.
-- =====================================================================

-- ---------- New user bootstrap --------------------------------------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  base_name text;
  candidate text;
  n int := 0;
begin
  base_name := lower(regexp_replace(
    coalesce(nullif(new.raw_user_meta_data ->> 'username', ''), split_part(new.email, '@', 1), 'coder'),
    '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_name) < 3 then base_name := base_name || 'coder'; end if;
  base_name := left(base_name, 18);
  candidate := base_name;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base_name || n::text;
  end loop;

  insert into public.profiles (id, username, full_name, preferred_language, terms_accepted_at)
  values (
    new.id,
    candidate,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 80),
    case when new.raw_user_meta_data ->> 'preferred_language' = 'bn' then 'bn' else 'en' end,
    case when (new.raw_user_meta_data ->> 'terms_accepted')::boolean then now() else null end
  );
  insert into public.user_stats (user_id) values (new.id);
  insert into public.user_roles (user_id, role) values (new.id, 'student');
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- Activity date (Bangladesh time) -------------------------
create or replace function public.activity_today()
returns date language sql stable as $$
  select (now() at time zone 'Asia/Dhaka')::date;
$$;

-- ---------- Streak + daily activity ---------------------------------
create or replace function public.touch_activity(
  p_user uuid, p_runs int default 0, p_submissions int default 0,
  p_accepted int default 0, p_lessons int default 0)
returns void language plpgsql security definer set search_path = public
as $$
declare
  today date := public.activity_today();
  last_day date;
begin
  insert into public.daily_activity as d (user_id, activity_date, runs, submissions, accepted, lessons_completed)
  values (p_user, today, p_runs, p_submissions, p_accepted, p_lessons)
  on conflict (user_id, activity_date) do update
    set runs = d.runs + excluded.runs,
        submissions = d.submissions + excluded.submissions,
        accepted = d.accepted + excluded.accepted,
        lessons_completed = d.lessons_completed + excluded.lessons_completed;

  insert into public.user_stats (user_id) values (p_user) on conflict do nothing;

  select last_active_date into last_day from public.user_stats where user_id = p_user for update;
  update public.user_stats
     set current_streak = case
           when last_day = today then current_streak
           when last_day = today - 1 then current_streak + 1
           else 1 end,
         last_active_date = today,
         updated_at = now()
   where user_id = p_user;
  update public.user_stats
     set longest_streak = greatest(longest_streak, current_streak)
   where user_id = p_user;
end $$;

-- ---------- Achievements --------------------------------------------
create or replace function public.award_achievements(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  s public.user_stats;
  a record;
  v int;
begin
  select * into s from public.user_stats where user_id = p_user;
  if not found then return; end if;
  for a in
    select * from public.achievements x
    where not exists (select 1 from public.user_achievements ua
                      where ua.user_id = p_user and ua.achievement_id = x.id)
  loop
    v := case a.metric
           when 'total_runs' then s.total_runs
           when 'accepted_submissions' then s.accepted_submissions
           when 'problems_solved' then s.problems_solved
           when 'lessons_completed' then s.lessons_completed
           when 'longest_streak' then s.longest_streak
         end;
    if v >= a.threshold then
      insert into public.user_achievements (user_id, achievement_id) values (p_user, a.id)
      on conflict do nothing;
      insert into public.notifications (user_id, kind, title, body, link)
      values (p_user, 'achievement', a.title_en, a.description_en, '/profile');
    end if;
  end loop;
end $$;

-- ---------- Recompute derived counters (idempotent) -----------------
-- Solved problems only count for published problems the user did not
-- author, so nobody can farm achievements with self-made problems.
create or replace function public.recompute_user_counts(p_user uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  update public.user_stats us set
    problems_solved = (
      select count(*) from public.user_problem_progress upp
      join public.problems p on p.id = upp.problem_id
      where upp.user_id = p_user and upp.solved_at is not null
        and p.status = 'published' and p.author_id is distinct from p_user),
    lessons_completed = (
      select count(*) from public.lesson_progress lp
      where lp.user_id = p_user and lp.state = 'completed'),
    updated_at = now()
  where us.user_id = p_user;
end $$;

-- ---------- Trigger: execution log → runs ---------------------------
create or replace function public.on_execution_logged()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.user_id is null or new.kind = 'submit' then return new; end if;
  update public.user_stats set total_runs = total_runs + 1, updated_at = now()
   where user_id = new.user_id;
  perform public.touch_activity(new.user_id, p_runs => 1);
  perform public.award_achievements(new.user_id);
  return new;
end $$;

create trigger code_execution_logs_after_insert
  after insert on public.code_execution_logs
  for each row execute function public.on_execution_logged();

-- ---------- Trigger: submission → stats + problem counters ----------
create or replace function public.on_submission_created()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  was_solved boolean;
  is_accepted boolean := new.verdict = 'accepted';
begin
  select (solved_at is not null) into was_solved
    from public.user_problem_progress
   where user_id = new.user_id and problem_id = new.problem_id;
  was_solved := coalesce(was_solved, false);

  insert into public.user_problem_progress as upp
    (user_id, problem_id, attempts, solved_at, best_time_ms, last_verdict, updated_at)
  values (new.user_id, new.problem_id, 1,
          case when is_accepted then new.created_at end,
          case when is_accepted then new.time_ms end,
          new.verdict, now())
  on conflict (user_id, problem_id) do update set
    attempts     = upp.attempts + 1,
    solved_at    = coalesce(upp.solved_at, excluded.solved_at),
    best_time_ms = case when is_accepted
                        then least(coalesce(upp.best_time_ms, excluded.best_time_ms), excluded.best_time_ms)
                        else upp.best_time_ms end,
    last_verdict = excluded.last_verdict,
    updated_at   = now();

  update public.problems set
    submission_count = submission_count + 1,
    accepted_count   = accepted_count + case when is_accepted then 1 else 0 end,
    solver_count     = solver_count + case when is_accepted and not was_solved then 1 else 0 end
  where id = new.problem_id;

  update public.user_stats set
    total_submissions    = total_submissions + 1,
    accepted_submissions = accepted_submissions + case when is_accepted then 1 else 0 end,
    updated_at = now()
  where user_id = new.user_id;

  perform public.recompute_user_counts(new.user_id);
  perform public.touch_activity(new.user_id,
            p_submissions => 1, p_accepted => case when is_accepted then 1 else 0 end);
  perform public.award_achievements(new.user_id);
  return new;
end $$;

create trigger submissions_after_insert
  after insert on public.submissions
  for each row execute function public.on_submission_created();

-- ---------- Trigger: lesson completed → stats -----------------------
create or replace function public.on_lesson_progress_changed()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.state = 'completed' and (tg_op = 'INSERT' or old.state is distinct from 'completed') then
    perform public.recompute_user_counts(new.user_id);
    perform public.touch_activity(new.user_id, p_lessons => 1);
    perform public.award_achievements(new.user_id);
  end if;
  return new;
end $$;

create trigger lesson_progress_after_write
  after insert or update on public.lesson_progress
  for each row execute function public.on_lesson_progress_changed();

-- =====================================================================
-- READ RPCs used by the app
-- =====================================================================

-- Deterministic "problem of the day" from published official problems.
create or replace function public.get_daily_problem()
returns table (id uuid, slug text, title text, title_bn text, difficulty public.difficulty, topic_id uuid)
language sql stable security invoker set search_path = public
as $$
  select p.id, p.slug, p.title, p.title_bn, p.difficulty, p.topic_id
  from public.problems p
  where p.status = 'published' and p.is_official
  order by md5(p.id::text || public.activity_today()::text)
  limit 1;
$$;

-- Topic practice overview: problem counts + caller's solved counts.
create or replace function public.get_topic_progress()
returns table (topic_id uuid, slug text, name_en text, name_bn text, sort_order int,
               total int, easy int, medium int, hard int, solved int)
language sql stable security invoker set search_path = public
as $$
  select t.id, t.slug, t.name_en, t.name_bn, t.sort_order,
         count(p.id)::int,
         count(p.id) filter (where p.difficulty = 'easy')::int,
         count(p.id) filter (where p.difficulty = 'medium')::int,
         count(p.id) filter (where p.difficulty = 'hard')::int,
         count(upp.problem_id) filter (where upp.solved_at is not null)::int
  from public.problem_topics t
  left join public.problems p on p.topic_id = t.id and p.status = 'published'
  left join public.user_problem_progress upp
         on upp.problem_id = p.id and upp.user_id = auth.uid()
  group by t.id
  order by t.sort_order;
$$;

-- Course progress for the caller.
create or replace function public.get_course_progress()
returns table (course_id uuid, total int, completed int, last_lesson_id uuid)
language sql stable security invoker set search_path = public
as $$
  select c.id,
         count(l.id)::int,
         count(lp.lesson_id) filter (where lp.state = 'completed')::int,
         (select lp2.lesson_id from public.lesson_progress lp2
            join public.lessons l2 on l2.id = lp2.lesson_id
           where lp2.user_id = auth.uid() and l2.course_id = c.id
           order by lp2.updated_at desc limit 1)
  from public.courses c
  left join public.lessons l on l.course_id = c.id
  left join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = auth.uid()
  group by c.id;
$$;

-- Public counters for the landing page (aggregate only, no PII).
create or replace function public.get_public_counts()
returns json language sql stable security definer set search_path = public
as $$
  select json_build_object(
    'problems', (select count(*) from public.problems where status = 'published'),
    'lessons',  (select count(*) from public.lessons where is_published)
  );
$$;

-- =====================================================================
-- ADMIN RPCs — every function re-checks is_admin() server-side
-- =====================================================================
create or replace function public.assert_admin()
returns void language plpgsql stable security definer set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'Administrator privileges required.' using errcode = '42501';
  end if;
end $$;

create or replace function public.admin_dashboard_stats()
returns json language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  return json_build_object(
    'total_users',          (select count(*) from public.profiles),
    'active_users_7d',      (select count(distinct user_id) from public.daily_activity
                              where activity_date >= public.activity_today() - 6),
    'suspended_users',      (select count(*) from public.profiles where status = 'suspended'),
    'total_problems',       (select count(*) from public.problems where status = 'published'),
    'pending_problems',     (select count(*) from public.problems where status = 'pending_review'),
    'total_submissions',    (select count(*) from public.submissions),
    'accepted_submissions', (select count(*) from public.submissions where verdict = 'accepted'),
    'runs_7d',              (select count(*) from public.code_execution_logs
                              where created_at >= now() - interval '7 days'),
    'open_reports',         (select count(*) from public.problem_reports where status = 'open'),
    'courses',              (select count(*) from public.courses),
    'published_lessons',    (select count(*) from public.lessons where is_published),
    'lesson_completions',   (select count(*) from public.lesson_progress where state = 'completed'),
    'recent_submissions', (
      select coalesce(json_agg(r), '[]'::json) from (
        select s.id, s.verdict, s.language, s.created_at, p.title as problem_title, pr.username
        from public.submissions s
        join public.problems p on p.id = s.problem_id
        join public.profiles pr on pr.id = s.user_id
        order by s.created_at desc limit 10) r),
    'recent_signups', (
      select coalesce(json_agg(r), '[]'::json) from (
        select id, username, full_name, created_at from public.profiles
        order by created_at desc limit 8) r)
  );
end $$;

create or replace function public.admin_list_users(p_search text default '', p_limit int default 25, p_offset int default 0)
returns table (id uuid, email text, username text, full_name text, avatar_url text,
               status public.account_status, is_admin boolean, created_at timestamptz,
               problems_solved int, lessons_completed int, last_active_date date, total_count bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  return query
  select p.id, u.email::text, p.username, p.full_name, p.avatar_url, p.status,
         exists (select 1 from public.user_roles r where r.user_id = p.id and r.role = 'admin'),
         p.created_at, coalesce(s.problems_solved, 0), coalesce(s.lessons_completed, 0), s.last_active_date,
         count(*) over ()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.user_stats s on s.user_id = p.id
  where coalesce(p_search, '') = ''
     or p.username ilike '%' || p_search || '%'
     or p.full_name ilike '%' || p_search || '%'
     or u.email ilike '%' || p_search || '%'
  order by p.created_at desc
  limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_set_user_status(p_user uuid, p_status public.account_status)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() then
    raise exception 'You cannot change your own account status.' using errcode = '42501';
  end if;
  update public.profiles set status = p_status where id = p_user;
end $$;

create or replace function public.admin_set_role(p_user uuid, p_role public.app_role, p_grant boolean)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  if p_user = auth.uid() and not p_grant then
    raise exception 'You cannot remove your own role.' using errcode = '42501';
  end if;
  if p_grant then
    insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, auth.uid())
    on conflict do nothing;
  else
    delete from public.user_roles where user_id = p_user and role = p_role;
  end if;
end $$;

create or replace function public.admin_moderate_problem(
  p_problem uuid, p_status public.problem_status, p_note text default null, p_featured boolean default null)
returns void language plpgsql security definer set search_path = public
as $$
declare
  v_author uuid;
  v_title text;
begin
  perform public.assert_admin();
  update public.problems
     set status = p_status,
         moderation_note = coalesce(p_note, moderation_note),
         is_featured = coalesce(p_featured, is_featured),
         visibility = case when p_status = 'published' then 'public' else visibility end
   where id = p_problem
  returning author_id, title into v_author, v_title;
  if v_author is not null and v_author <> auth.uid() then
    insert into public.notifications (user_id, kind, title, body, link)
    values (v_author, 'moderation',
            'Problem ' || replace(p_status::text, '_', ' '),
            coalesce(p_note, 'Your problem "' || v_title || '" was reviewed.'),
            '/problems/mine');
  end if;
end $$;

-- ---------- First-admin bootstrap (trusted callers only) ------------
-- Run from the Supabase SQL editor or with the service-role key:
--   select public.bootstrap_admin('you@example.com');
create or replace function public.bootstrap_admin(p_email text)
returns text language plpgsql security definer set search_path = public
as $$
declare v_id uuid;
begin
  select id into v_id from auth.users where lower(email) = lower(p_email);
  if v_id is null then
    raise exception 'No user with email %. Sign up first, then run this again.', p_email;
  end if;
  insert into public.user_roles (user_id, role) values (v_id, 'admin') on conflict do nothing;
  return 'Admin role granted to ' || p_email;
end $$;

-- ---------- Function privileges -------------------------------------
revoke all on function public.handle_new_user()                         from public, anon, authenticated;
revoke all on function public.touch_activity(uuid, int, int, int, int)  from public, anon, authenticated;
revoke all on function public.award_achievements(uuid)                  from public, anon, authenticated;
revoke all on function public.recompute_user_counts(uuid)               from public, anon, authenticated;
revoke all on function public.on_execution_logged()                     from public, anon, authenticated;
revoke all on function public.on_submission_created()                   from public, anon, authenticated;
revoke all on function public.on_lesson_progress_changed()              from public, anon, authenticated;
revoke all on function public.bootstrap_admin(text)                     from public, anon, authenticated;
grant execute on function public.bootstrap_admin(text) to service_role;

revoke all on function public.admin_dashboard_stats()                                   from public, anon;
revoke all on function public.admin_list_users(text, int, int)                          from public, anon;
revoke all on function public.admin_set_user_status(uuid, public.account_status)        from public, anon;
revoke all on function public.admin_set_role(uuid, public.app_role, boolean)            from public, anon;
revoke all on function public.admin_moderate_problem(uuid, public.problem_status, text, boolean) from public, anon;
grant execute on function public.admin_dashboard_stats()                                to authenticated;
grant execute on function public.admin_list_users(text, int, int)                       to authenticated;
grant execute on function public.admin_set_user_status(uuid, public.account_status)     to authenticated;
grant execute on function public.admin_set_role(uuid, public.app_role, boolean)         to authenticated;
grant execute on function public.admin_moderate_problem(uuid, public.problem_status, text, boolean) to authenticated;
grant execute on function public.get_daily_problem()   to anon, authenticated;
grant execute on function public.get_topic_progress()  to anon, authenticated;
grant execute on function public.get_course_progress() to anon, authenticated;
grant execute on function public.get_public_counts()   to anon, authenticated;
