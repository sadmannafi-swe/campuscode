-- =====================================================================
-- CampusCode — Certificates of Completion
--
-- A student receives at most ONE certificate per course, issued
-- automatically (no admin approval) the moment every mandatory
-- requirement is met. Everything is decided here, from trusted rows:
--
--   1. every published lesson of the course is completed (lesson_progress),
--   2. every required PRACTICE problem is solved — "solved" is written only
--      by the judge (submissions are inserted by the `submit` Edge Function
--      with the service role; students cannot write submissions),
--   3. the FINAL ASSESSMENT score is >= the pass mark (70 %): the weighted
--      share of test cases passed by the student's best judged submission
--      on each assessment problem,
--   4. the course has certificates enabled and is fully configured, the
--      account is active and has a display name.
--
-- If a course has no practice or no assessment configured, nothing is
-- issued — completion is never invented. Video watching never counts.
--
-- PDFs are rendered by the `certificates` Edge Function into a PRIVATE
-- bucket; downloads use short-lived signed URLs. Public verification goes
-- through verify_certificate(), which returns only non-private fields.
-- =====================================================================

create type public.certificate_status      as enum ('valid', 'revoked');
create type public.course_requirement_kind as enum ('practice', 'assessment');

-- ---------- Per-course configuration (admin) --------------------------
create table public.course_certificate_settings (
  course_id          uuid primary key references public.courses (id) on delete cascade,
  enabled            boolean not null default false,
  -- The pass mark can be raised but never set below the 70 % minimum.
  passing_score      numeric(5,2) not null default 70 check (passing_score between 70 and 100),
  issuer_designation text check (issuer_designation is null or char_length(btrim(issuer_designation)) between 2 and 80),
  updated_by         uuid references auth.users (id) on delete set null,
  updated_at         timestamptz not null default now()
);
create trigger course_certificate_settings_updated_at before update on public.course_certificate_settings
  for each row execute function public.set_updated_at();

-- Practice activities and final-assessment items reuse judge problems.
create table public.course_requirement_problems (
  course_id  uuid not null references public.courses (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  kind       public.course_requirement_kind not null,
  weight     smallint not null default 1 check (weight between 1 and 10),
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  primary key (course_id, problem_id)   -- a problem is practice OR assessment within one course
);
create index course_requirement_problems_problem_idx on public.course_requirement_problems (problem_id);
create index course_requirement_problems_course_idx  on public.course_requirement_problems (course_id, kind, sort_order);

-- ---------- Certificates ----------------------------------------------
create table public.certificates (
  id                 uuid primary key default gen_random_uuid(),
  user_id            uuid not null references auth.users (id) on delete cascade,
  course_id          uuid not null references public.courses (id) on delete restrict,
  certificate_number text not null unique check (certificate_number ~ '^CC-[0-9]{4}-[A-HJ-NP-Z2-9]{8}$'),
  verification_token text not null unique check (verification_token ~ '^[A-Za-z0-9_-]{32}$'),
  -- Snapshots: the certificate states what was true when it was issued.
  student_name       text not null check (char_length(student_name) between 1 and 80),
  course_title       text not null check (char_length(course_title) between 1 and 200),
  issuer_designation text,
  final_score        numeric(5,2) not null check (final_score between 0 and 100),
  status             public.certificate_status not null default 'valid',
  issued_at          timestamptz not null default now(),
  pdf_path           text,
  pdf_generated_at   timestamptz,
  pdf_error          text,
  revoked_at         timestamptz,
  revoked_by         uuid references auth.users (id) on delete set null,
  revocation_reason  text,
  created_at         timestamptz not null default now(),
  unique (user_id, course_id),
  constraint certificates_revocation_consistent check (
    (status = 'valid'   and revoked_at is null and revocation_reason is null) or
    (status = 'revoked' and revoked_at is not null and char_length(btrim(revocation_reason)) between 5 and 500)
  )
);
create index certificates_course_idx on public.certificates (course_id, issued_at desc);
create index certificates_issued_idx on public.certificates (issued_at desc);
create index certificates_status_idx on public.certificates (status, issued_at desc);

-- Append-only audit trail of issuance, PDF generation and revocation.
create table public.certificate_events (
  id             bigint generated always as identity primary key,
  certificate_id uuid references public.certificates (id) on delete cascade,
  user_id        uuid references auth.users (id) on delete cascade,
  course_id      uuid references public.courses (id) on delete cascade,
  event          text not null check (event in ('issued', 'pdf_generated', 'pdf_failed', 'revoked', 'issue_failed')),
  actor_id       uuid references auth.users (id) on delete set null,
  details        jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
create index certificate_events_cert_idx on public.certificate_events (certificate_id, created_at desc);
create index certificate_events_time_idx on public.certificate_events (created_at desc);

-- Where the database asks the Edge Function to render a fresh PDF (not secret).
insert into public.platform_settings (key, value, is_public)
values ('certificates.functions_url', '"https://dcutfxcdpomnmzgezntf.supabase.co/functions/v1"'::jsonb, false)
on conflict (key) do nothing;

-- =====================================================================
-- Eligibility (trusted, server-side only)
-- =====================================================================

-- What a course still lacks before certificates can be issued at all.
create or replace function public.course_certificate_config(p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  s public.course_certificate_settings;
  c public.courses;
  n_lessons int; n_practice int; n_assessment int;
  missing text[] := '{}';
begin
  select * into c from public.courses where id = p_course;
  if not found then return null; end if;
  select * into s from public.course_certificate_settings where course_id = p_course;

  select count(*) into n_lessons
    from public.lessons l join public.chapters ch on ch.id = l.chapter_id
   where l.course_id = p_course and l.is_published and ch.is_published;
  select count(*) filter (where r.kind = 'practice'), count(*) filter (where r.kind = 'assessment')
    into n_practice, n_assessment
    from public.course_requirement_problems r
    join public.problems p on p.id = r.problem_id and p.status = 'published'
   where r.course_id = p_course;

  if s.course_id is null or not s.enabled then missing := array_append(missing, 'certificates_disabled'); end if;
  if not c.is_published  then missing := array_append(missing, 'course_unpublished'); end if;
  if n_lessons = 0       then missing := array_append(missing, 'no_published_lessons'); end if;
  if n_practice = 0      then missing := array_append(missing, 'no_practice_requirements'); end if;
  if n_assessment = 0    then missing := array_append(missing, 'no_final_assessment'); end if;

  return jsonb_build_object(
    'course_id', p_course,
    'configured', cardinality(missing) = 0,
    'missing', to_jsonb(missing),
    'enabled', coalesce(s.enabled, false),
    'passing_score', coalesce(s.passing_score, 70),
    'issuer_designation', s.issuer_designation,
    'lessons', n_lessons, 'practice', n_practice, 'assessment', n_assessment);
end $$;

-- Full requirement check for one student and one course.
create or replace function public.certificate_eligibility(p_user uuid, p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  cfg jsonb;
  prof public.profiles;
  lessons_done int; practice_done int;
  score numeric; attempted int;
  pass numeric;
  name_ok boolean; account_ok boolean;
  eligible boolean;
begin
  cfg := public.course_certificate_config(p_course);
  if cfg is null then return null; end if;
  pass := (cfg->>'passing_score')::numeric;

  select * into prof from public.profiles where id = p_user;
  account_ok := found and prof.status = 'active';
  name_ok := found and char_length(btrim(prof.full_name)) between 1 and 80;

  select count(*) into lessons_done
    from public.lessons l
    join public.chapters ch on ch.id = l.chapter_id
    join public.lesson_progress lp on lp.lesson_id = l.id and lp.user_id = p_user and lp.state = 'completed'
   where l.course_id = p_course and l.is_published and ch.is_published;

  select count(*) into practice_done
    from public.course_requirement_problems r
    join public.problems p on p.id = r.problem_id and p.status = 'published'
    join public.user_problem_progress upp on upp.problem_id = r.problem_id and upp.user_id = p_user
                                         and upp.solved_at is not null
   where r.course_id = p_course and r.kind = 'practice';

  -- Weighted share of tests passed by the best judged submission per assessment problem.
  with req as (
    select r.problem_id, r.weight
      from public.course_requirement_problems r
      join public.problems p on p.id = r.problem_id and p.status = 'published'
     where r.course_id = p_course and r.kind = 'assessment'
  ), best as (
    select s.problem_id, max(s.passed_count::numeric / s.total_count) as ratio
      from public.submissions s join req on req.problem_id = s.problem_id
     where s.user_id = p_user and s.total_count > 0
     group by s.problem_id
  )
  select case when sum(req.weight) > 0
              then 100 * sum(req.weight * coalesce(best.ratio, 0)) / sum(req.weight) end,
         count(best.problem_id)
    into score, attempted
    from req left join best on best.problem_id = req.problem_id;

  eligible := (cfg->>'configured')::boolean and account_ok and name_ok
          and lessons_done = (cfg->>'lessons')::int
          and practice_done = (cfg->>'practice')::int
          and score is not null and score >= pass;

  return jsonb_build_object(
    'course_id', p_course,
    'configured', (cfg->>'configured')::boolean,
    'missing_config', cfg->'missing',
    'eligible', eligible,
    'account_active', account_ok,
    'name_present', name_ok,
    'lessons', jsonb_build_object('done', lessons_done, 'total', (cfg->>'lessons')::int),
    'practice', jsonb_build_object('done', practice_done, 'total', (cfg->>'practice')::int),
    'assessment', jsonb_build_object(
        'score', case when score is null then null else trunc(score, 2) end,
        'passing_score', pass,
        'attempted', attempted,
        'total', (cfg->>'assessment')::int,
        'passed', score is not null and score >= pass));
end $$;

-- =====================================================================
-- Issuance (idempotent, race-safe)
-- =====================================================================
create or replace function public.certificate_random_number()
returns text language plpgsql volatile set search_path = public, extensions
as $$
declare
  alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';  -- 32 symbols: no 0/O/1/I
  b bytea := gen_random_bytes(8);
  out text := '';
begin
  for i in 0..7 loop
    out := out || substr(alphabet, (get_byte(b, i) % 32) + 1, 1);   -- 256 % 32 = 0 → unbiased
  end loop;
  return 'CC-' || to_char(now() at time zone 'Asia/Dhaka', 'YYYY') || '-' || out;
end $$;

-- 24 random bytes → 32 URL-safe characters (192 bits).
create or replace function public.certificate_random_token()
returns text language sql volatile set search_path = public, extensions
as $$ select translate(encode(gen_random_bytes(24), 'base64'), '+/', '-_') $$;

-- Ask the Edge Function to render the PDF. Best effort: pg_net sends the
-- request only after this transaction commits; failures are retried lazily
-- (the student's certificate list / download renders any missing PDF).
create or replace function public.request_certificate_pdf(p_certificate uuid)
returns void language plpgsql security definer set search_path = public
as $$
declare
  base text;
begin
  if not exists (select 1 from pg_extension where extname = 'pg_net') then return; end if;
  select value #>> '{}' into base from public.platform_settings where key = 'certificates.functions_url';
  if coalesce(base, '') = '' then return; end if;
  execute 'select net.http_post(url := $1, body := $2, headers := $3, timeout_milliseconds := 30000)'
    using base || '/certificates',
          jsonb_build_object('action', 'render', 'certificate_id', p_certificate),
          '{"Content-Type": "application/json"}'::jsonb;
exception when others then
  raise warning 'request_certificate_pdf(%): %', p_certificate, sqlerrm;
end $$;

create or replace function public.issue_certificate_if_eligible(p_user uuid, p_course uuid)
returns uuid language plpgsql volatile security definer set search_path = public
as $$
declare
  v_id uuid;
  e jsonb;
  prof public.profiles;
  crs public.courses;
  cfg public.course_certificate_settings;
begin
  if p_user is null or p_course is null then return null; end if;
  select id into v_id from public.certificates where user_id = p_user and course_id = p_course;
  if found then return v_id; end if;

  -- Serialise concurrent attempts for the same (student, course).
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
              (e #>> '{assessment,score}')::numeric)
      on conflict (user_id, course_id) do nothing
      returning id into v_id;
      exit;
    exception when unique_violation then
      -- certificate_number / token collision (astronomically rare): draw again
      if attempt = 6 then raise; end if;
    end;
  end loop;

  if v_id is null then   -- lost a race that the lock should have prevented: return the winner
    select id into v_id from public.certificates where user_id = p_user and course_id = p_course;
    return v_id;
  end if;

  insert into public.certificate_events (certificate_id, user_id, course_id, event, details)
  values (v_id, p_user, p_course, 'issued', jsonb_build_object('eligibility', e));
  -- Exactly one notification: this branch only runs for the insert that created the row.
  insert into public.notifications (user_id, kind, title, body, link)
  values (p_user, 'certificate', 'Certificate earned: ' || crs.title_en,
          'Congratulations! Your Certificate of Completion is ready to view and download.',
          '/profile#certificates');
  perform public.request_certificate_pdf(v_id);
  return v_id;
end $$;

-- Trigger wrapper: certificate problems must never break lesson progress or judging.
create or replace function public.try_issue_certificate(p_user uuid, p_course uuid)
returns void language plpgsql security definer set search_path = public
as $$
begin
  perform public.issue_certificate_if_eligible(p_user, p_course);
exception when others then
  raise warning 'certificate issuance failed for % / %: %', p_user, p_course, sqlerrm;
  insert into public.certificate_events (user_id, course_id, event, details)
  values (p_user, p_course, 'issue_failed', jsonb_build_object('error', sqlerrm, 'sqlstate', sqlstate));
end $$;

create or replace function public.on_lesson_completed_certificate()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  if new.state = 'completed' and (tg_op = 'INSERT' or old.state is distinct from 'completed') then
    perform public.try_issue_certificate(new.user_id, l.course_id)
       from public.lessons l where l.id = new.lesson_id;
  end if;
  return new;
end $$;
create trigger lesson_progress_certificate
  after insert or update on public.lesson_progress
  for each row execute function public.on_lesson_completed_certificate();

-- Runs after submissions_after_insert (trigger names fire alphabetically),
-- so user_problem_progress already reflects this verdict.
create or replace function public.on_submission_certificate()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  perform public.try_issue_certificate(new.user_id, r.course_id)
     from public.course_requirement_problems r where r.problem_id = new.problem_id;
  return new;
end $$;
create trigger submissions_certificate
  after insert on public.submissions
  for each row execute function public.on_submission_certificate();

-- =====================================================================
-- Student-facing RPCs
-- =====================================================================

-- The caller's requirement checklist for a course (never another user's).
create or replace function public.get_my_certificate_progress(p_course uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare
  me uuid := auth.uid();
  e jsonb;
  cert record;
begin
  if me is null then return null; end if;
  e := public.certificate_eligibility(me, p_course);
  if e is null then return null; end if;
  select id, certificate_number, status, issued_at into cert
    from public.certificates where user_id = me and course_id = p_course;
  return e || jsonb_build_object('certificate',
    case when cert.id is null then null
         else jsonb_build_object('id', cert.id, 'certificate_number', cert.certificate_number,
                                 'status', cert.status, 'issued_at', cert.issued_at) end);
end $$;

-- Public verification: only non-private fields, looked up by the unguessable token.
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
      from public.certificates c where c.verification_token = p_token;
  if not found then
    return query select 'not_found'::text, null::text, null::text, null::text, null::timestamptz, 'CampusCode'::text;
  end if;
end $$;

-- =====================================================================
-- Admin RPCs (each re-checks is_admin() server-side)
-- =====================================================================
create or replace function public.admin_list_certificates(
  p_search text default '', p_course uuid default null, p_status public.certificate_status default null,
  p_from date default null, p_to date default null, p_limit int default 25, p_offset int default 0)
returns table (id uuid, certificate_number text, verification_token text, status public.certificate_status,
               issued_at timestamptz, student_name text, username text, user_id uuid,
               course_id uuid, course_title text, final_score numeric, has_pdf boolean,
               revoked_at timestamptz, revocation_reason text, total_count bigint)
language plpgsql stable security definer set search_path = public
as $$
declare q text := btrim(coalesce(p_search, ''));
begin
  perform public.assert_admin();
  return query
  select c.id, c.certificate_number, c.verification_token, c.status, c.issued_at, c.student_name,
         p.username, c.user_id, c.course_id, c.course_title, c.final_score, c.pdf_path is not null,
         c.revoked_at, c.revocation_reason, count(*) over ()
    from public.certificates c
    left join public.profiles p on p.id = c.user_id
   where (q = '' or c.certificate_number ilike '%' || q || '%' or c.student_name ilike '%' || q || '%'
          or p.username ilike '%' || q || '%' or c.course_title ilike '%' || q || '%')
     and (p_course is null or c.course_id = p_course)
     and (p_status is null or c.status = p_status)
     and (p_from is null or c.issued_at >= p_from::timestamptz)
     and (p_to is null or c.issued_at < (p_to + 1)::timestamptz)
   order by c.issued_at desc
   limit least(greatest(p_limit, 1), 100) offset greatest(p_offset, 0);
end $$;

create or replace function public.admin_certificate_detail(p_certificate uuid)
returns jsonb language plpgsql stable security definer set search_path = public
as $$
declare c public.certificates; r jsonb;
begin
  perform public.assert_admin();
  select * into c from public.certificates where id = p_certificate;
  if not found then return null; end if;
  select jsonb_build_object(
    'certificate', to_jsonb(c) || jsonb_build_object('username', p.username),
    'events', coalesce((select jsonb_agg(jsonb_build_object('event', e.event, 'created_at', e.created_at,
                                                            'details', e.details, 'actor', a.username)
                                         order by e.created_at desc)
                          from public.certificate_events e left join public.profiles a on a.id = e.actor_id
                         where e.certificate_id = c.id), '[]'::jsonb))
    into r
    from public.profiles p where p.id = c.user_id;
  return coalesce(r, jsonb_build_object('certificate', to_jsonb(c), 'events', '[]'::jsonb));
end $$;

create or replace function public.admin_revoke_certificate(p_certificate uuid, p_reason text)
returns void language plpgsql security definer set search_path = public
as $$
declare c public.certificates; reason text := btrim(coalesce(p_reason, ''));
begin
  perform public.assert_admin();
  if char_length(reason) < 5 or char_length(reason) > 500 then
    raise exception 'A revocation reason of 5–500 characters is required.' using errcode = '22023';
  end if;
  select * into c from public.certificates where id = p_certificate for update;
  if not found then raise exception 'Certificate not found.' using errcode = 'P0002'; end if;
  if c.status = 'revoked' then raise exception 'This certificate is already revoked.' using errcode = '22023'; end if;
  update public.certificates
     set status = 'revoked', revoked_at = now(), revoked_by = auth.uid(), revocation_reason = reason
   where id = c.id;
  insert into public.certificate_events (certificate_id, user_id, course_id, event, actor_id, details)
  values (c.id, c.user_id, c.course_id, 'revoked', auth.uid(), jsonb_build_object('reason', reason));
  insert into public.notifications (user_id, kind, title, body, link)
  values (c.user_id, 'certificate', 'Certificate revoked: ' || c.course_title,
          'Your certificate ' || c.certificate_number || ' was revoked by the CampusCode team. Reason: ' || reason,
          '/profile#certificates');
end $$;

-- Per-course configuration status for the admin screen.
create or replace function public.admin_certificate_courses()
returns table (course_id uuid, slug text, title_en text, language public.prog_lang, config jsonb,
               issued bigint, revoked bigint)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public.assert_admin();
  return query
  select c.id, c.slug, c.title_en, c.language, public.course_certificate_config(c.id),
         (select count(*) from public.certificates x where x.course_id = c.id and x.status = 'valid'),
         (select count(*) from public.certificates x where x.course_id = c.id and x.status = 'revoked')
    from public.courses c order by c.sort_order, c.title_en;
end $$;

-- After enabling or changing a course's requirements: issue to everyone who already qualifies.
create or replace function public.admin_issue_eligible_certificates(p_course uuid)
returns int language plpgsql security definer set search_path = public
as $$
declare u uuid; n int := 0; before_count int; after_count int;
begin
  perform public.assert_admin();
  select count(*) into before_count from public.certificates where course_id = p_course;
  for u in
    select distinct lp.user_id from public.lesson_progress lp
      join public.lessons l on l.id = lp.lesson_id
     where l.course_id = p_course and lp.state = 'completed'
  loop
    perform public.try_issue_certificate(u, p_course);
  end loop;
  select count(*) into after_count from public.certificates where course_id = p_course;
  return after_count - before_count;
end $$;

-- =====================================================================
-- Privileges & RLS
-- =====================================================================
alter table public.course_certificate_settings  enable row level security;
alter table public.course_requirement_problems  enable row level security;
alter table public.certificates                 enable row level security;
alter table public.certificate_events           enable row level security;

-- Configuration is public knowledge (students must know what to complete); admins write.
create policy "certificate settings: read" on public.course_certificate_settings
  for select to anon, authenticated using (true);
create policy "certificate settings: admin write" on public.course_certificate_settings
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "course requirements: read" on public.course_requirement_problems
  for select to anon, authenticated using (true);
create policy "course requirements: admin write" on public.course_requirement_problems
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

-- Certificates: owners and admins may read; nobody writes through the API.
revoke all on public.certificates from anon, authenticated;
grant select (id, user_id, course_id, certificate_number, verification_token, student_name, course_title,
              issuer_designation, final_score, status, issued_at, pdf_generated_at, revoked_at,
              revocation_reason, created_at)
  on public.certificates to authenticated;
create policy "certificates: read own" on public.certificates
  for select to authenticated using (user_id = (select auth.uid()) or (select public.is_admin()));

revoke all on public.certificate_events from anon, authenticated;
grant select on public.certificate_events to authenticated;
create policy "certificate events: admin read" on public.certificate_events
  for select to authenticated using ((select public.is_admin()));

-- Internal functions: service role / triggers only.
revoke all on function public.course_certificate_config(uuid)              from public, anon, authenticated;
revoke all on function public.certificate_eligibility(uuid, uuid)          from public, anon, authenticated;
revoke all on function public.certificate_random_number()                  from public, anon, authenticated;
revoke all on function public.certificate_random_token()                   from public, anon, authenticated;
revoke all on function public.request_certificate_pdf(uuid)                from public, anon, authenticated;
revoke all on function public.issue_certificate_if_eligible(uuid, uuid)    from public, anon, authenticated;
revoke all on function public.try_issue_certificate(uuid, uuid)            from public, anon, authenticated;
revoke all on function public.on_lesson_completed_certificate()            from public, anon, authenticated;
revoke all on function public.on_submission_certificate()                  from public, anon, authenticated;
grant execute on function public.course_certificate_config(uuid)           to service_role;
grant execute on function public.certificate_eligibility(uuid, uuid)       to service_role;
grant execute on function public.issue_certificate_if_eligible(uuid, uuid) to service_role;
grant execute on function public.request_certificate_pdf(uuid)             to service_role;

revoke all on function public.get_my_certificate_progress(uuid) from public, anon;
grant execute on function public.get_my_certificate_progress(uuid) to authenticated;
revoke all on function public.verify_certificate(text) from public;
grant execute on function public.verify_certificate(text) to anon, authenticated, service_role;

revoke all on function public.admin_list_certificates(text, uuid, public.certificate_status, date, date, int, int) from public, anon;
revoke all on function public.admin_certificate_detail(uuid)            from public, anon;
revoke all on function public.admin_revoke_certificate(uuid, text)      from public, anon;
revoke all on function public.admin_certificate_courses()               from public, anon;
revoke all on function public.admin_issue_eligible_certificates(uuid)   from public, anon;
grant execute on function public.admin_list_certificates(text, uuid, public.certificate_status, date, date, int, int) to authenticated;
grant execute on function public.admin_certificate_detail(uuid)          to authenticated;
grant execute on function public.admin_revoke_certificate(uuid, text)    to authenticated;
grant execute on function public.admin_certificate_courses()             to authenticated;
grant execute on function public.admin_issue_eligible_certificates(uuid) to authenticated;

-- ---------- Storage: private bucket, Edge Function (service role) only ----
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('certificates', 'certificates', false, 5242880, array['application/pdf'])
on conflict (id) do update
  set public = false, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
-- Deliberately NO storage.objects policies for this bucket: anon/authenticated
-- cannot list, read or write it. Downloads are short-lived signed URLs minted
-- by the Edge Function after an ownership (or admin) check.
