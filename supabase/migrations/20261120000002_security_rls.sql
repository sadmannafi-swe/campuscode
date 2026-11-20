-- =====================================================================
-- CampusCode — authorization helpers, guard triggers and RLS
-- Principles:
--   * Roles live in user_roles; clients can never write that table.
--   * is_admin() is evaluated server-side from auth.uid(), never from
--     anything the client sends.
--   * Hidden test cases are invisible to everyone except the problem's
--     author and admins. The judge reads them with the service role.
--   * Verdicts, stats, streaks and achievements are written only by
--     the service role (Edge Functions) or by SECURITY DEFINER triggers.
-- =====================================================================

-- ---------- Role helpers --------------------------------------------
create or replace function public.is_admin(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = p_user and role = 'admin'
  );
$$;

create or replace function public.is_active_user(p_user uuid default auth.uid())
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.profiles where id = p_user and status = 'active');
$$;

-- True for the service role / database owner (Edge Functions, SQL editor,
-- migrations) — i.e. any caller that is not an end-user API role.
create or replace function public.is_trusted_caller()
returns boolean
language sql stable
as $$
  select current_user not in ('authenticated', 'anon');
$$;

revoke all on function public.is_admin(uuid)       from public;
revoke all on function public.is_active_user(uuid) from public;
grant execute on function public.is_admin(uuid)       to anon, authenticated, service_role;
grant execute on function public.is_active_user(uuid) to anon, authenticated, service_role;
grant execute on function public.is_trusted_caller()   to anon, authenticated, service_role;

-- ---------- Guard: problems -----------------------------------------
-- Students may author problems, but can never publish, feature, mark
-- official, tamper with counters or change authorship.
create or replace function public.guard_problem_write()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_caller() or public.is_admin() then
    if new.status = 'published' and (tg_op = 'INSERT' or old.status is distinct from 'published') then
      new.published_at := coalesce(new.published_at, now());
    end if;
    return new;
  end if;

  if tg_op = 'INSERT' then
    new.author_id        := auth.uid();
    new.submission_count := 0;
    new.accepted_count   := 0;
    new.solver_count     := 0;
    new.published_at     := null;
  else
    if old.status = 'removed' then
      raise exception 'This problem was removed by a moderator and can no longer be edited.'
        using errcode = '42501';
    end if;
    new.author_id        := old.author_id;
    new.submission_count := old.submission_count;
    new.accepted_count   := old.accepted_count;
    new.solver_count     := old.solver_count;
    new.published_at     := old.published_at;
  end if;

  new.is_official     := false;
  new.is_featured     := false;
  new.moderation_note := case when tg_op = 'UPDATE' then old.moderation_note else null end;

  -- Public problems always go through moderation after any author edit.
  if new.visibility = 'public' then
    new.status := 'pending_review';
  else
    new.status := 'draft';
  end if;
  return new;
end $$;

create trigger problems_guard before insert or update on public.problems
  for each row execute function public.guard_problem_write();

-- ---------- Guard: test case count ----------------------------------
create or replace function public.guard_test_case_limit()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if (select count(*) from public.test_cases where problem_id = new.problem_id) >= 30 then
    raise exception 'A problem can have at most 30 test cases.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger test_cases_limit before insert on public.test_cases
  for each row execute function public.guard_test_case_limit();

-- ---------- Guard: lesson progress ----------------------------------
create or replace function public.guard_lesson_progress()
returns trigger language plpgsql
set search_path = public
as $$
begin
  if public.is_trusted_caller() then return new; end if;
  if tg_op = 'UPDATE' then
    new.user_id    := old.user_id;
    new.lesson_id  := old.lesson_id;
    new.started_at := old.started_at;
    -- completion is one-way; a completed lesson cannot be "un-completed"
    if old.state = 'completed' then
      new.state := 'completed';
      new.completed_at := old.completed_at;
    end if;
  end if;
  if new.state = 'completed' then
    new.completed_at := coalesce(new.completed_at, now());
    if new.completed_at > now() + interval '1 minute' then new.completed_at := now(); end if;
  else
    new.completed_at := null;
  end if;
  return new;
end $$;

create trigger lesson_progress_guard before insert or update on public.lesson_progress
  for each row execute function public.guard_lesson_progress();

-- =====================================================================
-- Column privileges (defence in depth on top of RLS)
-- =====================================================================
revoke update on public.profiles from anon, authenticated;
grant update (username, full_name, avatar_url, bio, institution, preferred_language,
              editor_theme, editor_font_size, auto_save, terms_accepted_at)
  on public.profiles to authenticated;

revoke insert, update, delete on public.user_roles            from anon, authenticated;
revoke insert, update, delete on public.submissions           from anon, authenticated;
revoke insert, update, delete on public.user_stats            from anon, authenticated;
revoke insert, update, delete on public.user_achievements     from anon, authenticated;
revoke insert, update, delete on public.daily_activity        from anon, authenticated;
revoke insert, update, delete on public.code_execution_logs   from anon, authenticated;
revoke insert, update, delete on public.user_problem_progress from anon, authenticated;
revoke insert, delete         on public.notifications         from anon, authenticated;
revoke update                 on public.notifications         from anon, authenticated;
grant  update (read_at)       on public.notifications         to authenticated;
revoke delete                 on public.lesson_progress       from anon, authenticated;

-- =====================================================================
-- Row Level Security
-- =====================================================================
alter table public.profiles              enable row level security;
alter table public.user_roles            enable row level security;
alter table public.platform_settings     enable row level security;
alter table public.announcements         enable row level security;
alter table public.courses               enable row level security;
alter table public.chapters              enable row level security;
alter table public.problem_topics        enable row level security;
alter table public.lessons               enable row level security;
alter table public.lesson_examples       enable row level security;
alter table public.lesson_progress       enable row level security;
alter table public.problems              enable row level security;
alter table public.test_cases            enable row level security;
alter table public.submissions           enable row level security;
alter table public.user_problem_progress enable row level security;
alter table public.problem_bookmarks     enable row level security;
alter table public.saved_codes           enable row level security;
alter table public.code_execution_logs   enable row level security;
alter table public.user_stats            enable row level security;
alter table public.achievements          enable row level security;
alter table public.user_achievements     enable row level security;
alter table public.daily_activity        enable row level security;
alter table public.problem_reports       enable row level security;
alter table public.notifications         enable row level security;

-- ---------- profiles -------------------------------------------------
-- Profiles expose only public-ish fields; any signed-in user may view
-- them (needed to show problem authors). Emails live in auth.users.
create policy "profiles: read" on public.profiles
  for select to authenticated using (true);
create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid())) with check (id = (select auth.uid()));
-- Admins change account status through admin_set_user_status() (see logic migration).

-- ---------- user_roles -----------------------------------------------
create policy "roles: read own" on public.user_roles
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- settings & announcements --------------------------------
create policy "settings: public read" on public.platform_settings
  for select to anon, authenticated using (is_public or (select public.is_admin()));
create policy "settings: admin write" on public.platform_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "announcements: read active" on public.announcements
  for select to anon, authenticated
  using ((is_active and starts_at <= now() and (ends_at is null or ends_at > now())) or (select public.is_admin()));
create policy "announcements: admin write" on public.announcements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- courses / chapters / lessons ----------------------------
create policy "courses: read published" on public.courses
  for select to anon, authenticated using (is_published or (select public.is_admin()));
create policy "courses: admin write" on public.courses
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "chapters: read published" on public.chapters
  for select to anon, authenticated
  using ((is_published and exists (select 1 from public.courses c where c.id = course_id and c.is_published))
         or (select public.is_admin()));
create policy "chapters: admin write" on public.chapters
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "lessons: read published" on public.lessons
  for select to anon, authenticated
  using ((is_published and exists (
            select 1 from public.chapters ch join public.courses c on c.id = ch.course_id
            where ch.id = chapter_id and ch.is_published and c.is_published))
         or (select public.is_admin()));
create policy "lessons: admin write" on public.lessons
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "lesson_examples: read via lesson" on public.lesson_examples
  for select to anon, authenticated
  using (exists (select 1 from public.lessons l where l.id = lesson_id));  -- lessons RLS applies
create policy "lesson_examples: admin write" on public.lesson_examples
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "lesson_progress: read own" on public.lesson_progress
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "lesson_progress: insert own" on public.lesson_progress
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.lessons l where l.id = lesson_id and l.is_published));
create policy "lesson_progress: update own" on public.lesson_progress
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- topics ---------------------------------------------------
create policy "topics: read" on public.problem_topics for select to anon, authenticated using (true);
create policy "topics: admin write" on public.problem_topics
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- ---------- problems -------------------------------------------------
create policy "problems: read visible" on public.problems
  for select to anon, authenticated
  using (status = 'published'
         or author_id = (select auth.uid())
         or (select public.is_admin()));
create policy "problems: create own" on public.problems
  for insert to authenticated
  with check ((author_id = (select auth.uid()) and (select public.is_active_user()))
              or (select public.is_admin()));
create policy "problems: update own or admin" on public.problems
  for update to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()))
  with check (author_id = (select auth.uid()) or (select public.is_admin()));
create policy "problems: delete own or admin" on public.problems
  for delete to authenticated
  using (author_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- test cases (hidden ones never leave the server) ---------
create policy "test_cases: read samples or own" on public.test_cases
  for select to anon, authenticated
  using (
    (is_sample and exists (select 1 from public.problems p where p.id = problem_id and p.status = 'published'))
    or exists (select 1 from public.problems p where p.id = problem_id
               and (p.author_id = (select auth.uid()) or (select public.is_admin())))
  );
create policy "test_cases: author or admin write" on public.test_cases
  for all to authenticated
  using (exists (select 1 from public.problems p where p.id = problem_id
                 and ((p.author_id = (select auth.uid()) and p.status <> 'removed') or (select public.is_admin()))))
  with check (exists (select 1 from public.problems p where p.id = problem_id
                 and ((p.author_id = (select auth.uid()) and p.status <> 'removed') or (select public.is_admin()))));

-- ---------- submissions & progress ----------------------------------
create policy "submissions: read own" on public.submissions
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "upp: read own" on public.user_problem_progress
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

create policy "bookmarks: own" on public.problem_bookmarks
  for all to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));

-- ---------- IDE ------------------------------------------------------
create policy "saved_codes: own read" on public.saved_codes
  for select to authenticated using (user_id = (select auth.uid()));
create policy "saved_codes: own insert" on public.saved_codes
  for insert to authenticated
  with check (user_id = (select auth.uid()) and (select public.is_active_user()));
create policy "saved_codes: own update" on public.saved_codes
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "saved_codes: own delete" on public.saved_codes
  for delete to authenticated using (user_id = (select auth.uid()));

create policy "exec_logs: read own" on public.code_execution_logs
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- stats & achievements ------------------------------------
create policy "stats: read own" on public.user_stats
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "achievements: read" on public.achievements
  for select to anon, authenticated using (true);
create policy "achievements: admin write" on public.achievements
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "user_achievements: read own" on public.user_achievements
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));
create policy "daily_activity: read own" on public.daily_activity
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

-- ---------- community ------------------------------------------------
create policy "reports: create own" on public.problem_reports
  for insert to authenticated
  with check (reporter_id = (select auth.uid()) and status = 'open' and (select public.is_active_user()));
create policy "reports: read own or admin" on public.problem_reports
  for select to authenticated using (reporter_id = (select auth.uid()) or (select public.is_admin()));
create policy "reports: admin update" on public.problem_reports
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "notifications: read own" on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy "notifications: mark read" on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
