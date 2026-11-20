-- =====================================================================
-- CampusCode — core schema
-- Tables, constraints and indexes. RLS policies live in the next
-- migration; trusted business logic (stats, verdict side-effects) in
-- the one after that.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- Enums ----------------------------------------------------
create type public.app_role        as enum ('student', 'admin');
create type public.prog_lang       as enum ('c', 'python');
create type public.difficulty      as enum ('easy', 'medium', 'hard');
create type public.problem_status  as enum ('draft', 'pending_review', 'published', 'rejected', 'removed');
create type public.problem_visibility as enum ('private', 'public');
create type public.verdict as enum (
  'accepted', 'wrong_answer', 'compilation_error', 'runtime_error',
  'time_limit_exceeded', 'memory_limit_exceeded', 'internal_error'
);
create type public.account_status  as enum ('active', 'suspended');
create type public.report_status   as enum ('open', 'resolved', 'dismissed');
create type public.lesson_state    as enum ('started', 'completed');

-- ---------- Helpers --------------------------------------------------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-- =====================================================================
-- USERS & ACCESS
-- =====================================================================
create table public.profiles (
  id                 uuid primary key references auth.users (id) on delete cascade,
  username           text not null unique
                       check (username ~ '^[a-z0-9_]{3,24}$'),
  full_name          text not null default '' check (char_length(full_name) <= 80),
  avatar_url         text check (avatar_url is null or char_length(avatar_url) <= 500),
  bio                text check (bio is null or char_length(bio) <= 280),
  institution        text check (institution is null or char_length(institution) <= 120),
  preferred_language text not null default 'en' check (preferred_language in ('en', 'bn')),
  editor_theme       text not null default 'ink-dark' check (editor_theme in ('ink-dark', 'paper-light')),
  editor_font_size   smallint not null default 15 check (editor_font_size between 12 and 22),
  auto_save          boolean not null default true,
  terms_accepted_at  timestamptz,
  status             public.account_status not null default 'active',
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();

create table public.user_roles (
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       public.app_role not null,
  granted_by uuid references auth.users (id) on delete set null,
  granted_at timestamptz not null default now(),
  primary key (user_id, role)
);

create table public.platform_settings (
  key        text primary key check (key ~ '^[a-z0-9_.]{2,64}$'),
  value      jsonb not null,
  is_public  boolean not null default true,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now()
);
create trigger platform_settings_updated_at before update on public.platform_settings
  for each row execute function public.set_updated_at();

create table public.announcements (
  id         uuid primary key default gen_random_uuid(),
  title_en   text not null check (char_length(title_en) between 1 and 160),
  title_bn   text check (title_bn is null or char_length(title_bn) <= 160),
  body_en    text not null default '' check (char_length(body_en) <= 2000),
  body_bn    text check (body_bn is null or char_length(body_bn) <= 2000),
  link       text check (link is null or char_length(link) <= 300),
  is_active  boolean not null default true,
  starts_at  timestamptz not null default now(),
  ends_at    timestamptz,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger announcements_updated_at before update on public.announcements
  for each row execute function public.set_updated_at();

-- =====================================================================
-- COURSES
-- =====================================================================
create table public.courses (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  language       public.prog_lang not null,
  title_en       text not null,
  title_bn       text not null,
  description_en text not null default '',
  description_bn text not null default '',
  level_en       text not null default 'Beginner',
  level_bn       text not null default 'শুরু থেকে',
  sort_order     int  not null default 0,
  is_published   boolean not null default false,
  is_featured    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create trigger courses_updated_at before update on public.courses
  for each row execute function public.set_updated_at();

create table public.chapters (
  id             uuid primary key default gen_random_uuid(),
  course_id      uuid not null references public.courses (id) on delete cascade,
  slug           text not null check (slug ~ '^[a-z0-9-]{2,60}$'),
  title_en       text not null,
  title_bn       text not null,
  description_en text not null default '',
  description_bn text not null default '',
  sort_order     int  not null default 0,
  is_published   boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (course_id, slug),
  unique (id, course_id)
);
create index chapters_course_idx on public.chapters (course_id, sort_order);
create trigger chapters_updated_at before update on public.chapters
  for each row execute function public.set_updated_at();

-- ---------- Problem topics (shared by practice + lessons) ------------
create table public.problem_topics (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]{2,60}$'),
  name_en        text not null,
  name_bn        text not null,
  description_en text not null default '',
  description_bn text not null default '',
  sort_order     int not null default 0,
  created_at     timestamptz not null default now()
);

create table public.lessons (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid not null,
  chapter_id         uuid not null,
  slug               text not null check (slug ~ '^[a-z0-9-]{2,80}$'),
  number             int  not null check (number > 0),
  title_en           text not null,
  title_bn           text not null,
  summary_en         text not null default '',
  summary_bn         text not null default '',
  objectives_en      text[] not null default '{}',
  objectives_bn      text[] not null default '{}',
  body_en            text not null default '',
  body_bn            text not null default '',
  common_mistakes_en text[] not null default '{}',
  common_mistakes_bn text[] not null default '{}',
  practice_en        text[] not null default '{}',
  practice_bn        text[] not null default '{}',
  video_url          text check (video_url is null or video_url ~ '^https://'),
  is_project         boolean not null default false,
  practice_topic_id  uuid references public.problem_topics (id) on delete set null,
  estimated_minutes  smallint not null default 15 check (estimated_minutes between 1 and 600),
  is_published       boolean not null default false,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  -- a lesson's course must equal its chapter's course
  foreign key (chapter_id, course_id) references public.chapters (id, course_id) on delete cascade,
  foreign key (course_id) references public.courses (id) on delete cascade,
  unique (course_id, slug),
  unique (course_id, number)
);
create index lessons_chapter_idx on public.lessons (chapter_id, number);
create trigger lessons_updated_at before update on public.lessons
  for each row execute function public.set_updated_at();

create table public.lesson_examples (
  id              uuid primary key default gen_random_uuid(),
  lesson_id       uuid not null references public.lessons (id) on delete cascade,
  sort_order      int not null default 0,
  title_en        text not null default '',
  title_bn        text not null default '',
  language        public.prog_lang not null,
  code            text not null check (char_length(code) <= 20000),
  stdin           text not null default '' check (char_length(stdin) <= 5000),
  expected_output text not null default '' check (char_length(expected_output) <= 5000),
  explanation_en  text not null default '',
  explanation_bn  text not null default '',
  created_at      timestamptz not null default now()
);
create index lesson_examples_lesson_idx on public.lesson_examples (lesson_id, sort_order);

create table public.lesson_progress (
  user_id      uuid not null references auth.users (id) on delete cascade,
  lesson_id    uuid not null references public.lessons (id) on delete cascade,
  state        public.lesson_state not null default 'started',
  started_at   timestamptz not null default now(),
  completed_at timestamptz,
  updated_at   timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index lesson_progress_user_idx on public.lesson_progress (user_id, updated_at desc);
create trigger lesson_progress_updated_at before update on public.lesson_progress
  for each row execute function public.set_updated_at();

-- =====================================================================
-- PROBLEMS
-- =====================================================================
create table public.problems (
  id                  uuid primary key default gen_random_uuid(),
  slug                text not null unique check (slug ~ '^[a-z0-9-]{3,80}$'),
  title               text not null check (char_length(title) between 3 and 120),
  title_bn            text check (title_bn is null or char_length(title_bn) <= 120),
  statement           text not null check (char_length(statement) between 10 and 10000),
  statement_bn        text check (statement_bn is null or char_length(statement_bn) <= 10000),
  input_format        text not null default '' check (char_length(input_format) <= 3000),
  output_format       text not null default '' check (char_length(output_format) <= 3000),
  constraints         text not null default '' check (char_length(constraints) <= 2000),
  explanation         text not null default '' check (char_length(explanation) <= 5000),
  hints               text[] not null default '{}',
  difficulty          public.difficulty not null,
  topic_id            uuid references public.problem_topics (id) on delete set null,
  starter_code_c      text check (starter_code_c is null or char_length(starter_code_c) <= 20000),
  starter_code_python text check (starter_code_python is null or char_length(starter_code_python) <= 20000),
  allowed_languages   public.prog_lang[] not null default '{c,python}'
                        check (cardinality(allowed_languages) >= 1),
  time_limit_ms       int not null default 2000 check (time_limit_ms between 500 and 5000),
  memory_limit_kb     int not null default 131072 check (memory_limit_kb between 16384 and 262144),
  author_id           uuid references auth.users (id) on delete set null,
  is_official         boolean not null default false,
  visibility          public.problem_visibility not null default 'private',
  status              public.problem_status not null default 'draft',
  is_featured         boolean not null default false,
  moderation_note     text,
  submission_count    int not null default 0,
  accepted_count      int not null default 0,
  solver_count        int not null default 0,
  published_at        timestamptz,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create index problems_status_idx on public.problems (status, difficulty);
create index problems_topic_idx  on public.problems (topic_id);
create index problems_author_idx on public.problems (author_id);
create index problems_title_trgm on public.problems using gin (to_tsvector('simple', title));
create trigger problems_updated_at before update on public.problems
  for each row execute function public.set_updated_at();

create table public.test_cases (
  id              uuid primary key default gen_random_uuid(),
  problem_id      uuid not null references public.problems (id) on delete cascade,
  sort_order      int not null default 0,
  input           text not null default '' check (octet_length(input) <= 262144),
  expected_output text not null check (octet_length(expected_output) <= 262144),
  is_sample       boolean not null default false,
  explanation     text check (explanation is null or char_length(explanation) <= 2000),
  created_at      timestamptz not null default now()
);
create index test_cases_problem_idx on public.test_cases (problem_id, is_sample, sort_order);

create table public.submissions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  problem_id        uuid not null references public.problems (id) on delete cascade,
  language          public.prog_lang not null,
  source_code       text not null check (octet_length(source_code) <= 65536),
  verdict           public.verdict not null,
  passed_count      int not null default 0,
  total_count       int not null default 0,
  time_ms           int,
  memory_kb         int,
  compile_output    text check (compile_output is null or char_length(compile_output) <= 8000),
  failed_test_index int,
  created_at        timestamptz not null default now()
);
create index submissions_user_idx    on public.submissions (user_id, created_at desc);
create index submissions_problem_idx on public.submissions (problem_id, created_at desc);
create index submissions_verdict_idx on public.submissions (verdict, created_at desc);

create table public.user_problem_progress (
  user_id        uuid not null references auth.users (id) on delete cascade,
  problem_id     uuid not null references public.problems (id) on delete cascade,
  attempts       int not null default 0,
  solved_at      timestamptz,
  best_time_ms   int,
  last_verdict   public.verdict,
  updated_at     timestamptz not null default now(),
  primary key (user_id, problem_id)
);
create index upp_user_idx on public.user_problem_progress (user_id, solved_at);

create table public.problem_bookmarks (
  user_id    uuid not null references auth.users (id) on delete cascade,
  problem_id uuid not null references public.problems (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, problem_id)
);

-- =====================================================================
-- IDE
-- =====================================================================
create table public.saved_codes (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  title       text not null check (char_length(title) between 1 and 80),
  language    public.prog_lang not null,
  source_code text not null default '' check (octet_length(source_code) <= 65536),
  stdin       text not null default '' check (octet_length(stdin) <= 65536),
  description text check (description is null or char_length(description) <= 500),
  topic_id    uuid references public.problem_topics (id) on delete set null,
  problem_id  uuid references public.problems (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index saved_codes_user_idx on public.saved_codes (user_id, updated_at desc);
create trigger saved_codes_updated_at before update on public.saved_codes
  for each row execute function public.set_updated_at();

create table public.code_execution_logs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  ip_hash     text,
  kind        text not null default 'run' check (kind in ('run', 'samples', 'submit')),
  language    public.prog_lang not null,
  status      text not null,
  time_ms     int,
  memory_kb   int,
  source_size int not null default 0,
  problem_id  uuid references public.problems (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index cel_user_idx on public.code_execution_logs (user_id, created_at desc);
create index cel_ip_idx   on public.code_execution_logs (ip_hash, created_at desc);

-- =====================================================================
-- PROGRESS & GAMIFICATION
-- =====================================================================
create table public.user_stats (
  user_id              uuid primary key references auth.users (id) on delete cascade,
  problems_solved      int not null default 0,
  accepted_submissions int not null default 0,
  total_submissions    int not null default 0,
  total_runs           int not null default 0,
  lessons_completed    int not null default 0,
  current_streak       int not null default 0,
  longest_streak       int not null default 0,
  last_active_date     date,
  updated_at           timestamptz not null default now()
);

create table public.achievements (
  id             text primary key check (id ~ '^[a-z0-9_]{2,40}$'),
  title_en       text not null,
  title_bn       text not null,
  description_en text not null,
  description_bn text not null,
  icon           text not null default 'award',
  metric         text not null check (metric in ('total_runs', 'accepted_submissions', 'problems_solved', 'lessons_completed', 'longest_streak')),
  threshold      int not null check (threshold > 0),
  sort_order     int not null default 0
);

create table public.user_achievements (
  user_id        uuid not null references auth.users (id) on delete cascade,
  achievement_id text not null references public.achievements (id) on delete cascade,
  awarded_at     timestamptz not null default now(),
  primary key (user_id, achievement_id)
);

create table public.daily_activity (
  user_id           uuid not null references auth.users (id) on delete cascade,
  activity_date     date not null,
  runs              int not null default 0,
  submissions       int not null default 0,
  accepted          int not null default 0,
  lessons_completed int not null default 0,
  primary key (user_id, activity_date)
);

-- =====================================================================
-- COMMUNITY
-- =====================================================================
create table public.problem_reports (
  id          uuid primary key default gen_random_uuid(),
  problem_id  uuid not null references public.problems (id) on delete cascade,
  reporter_id uuid not null references auth.users (id) on delete cascade,
  reason      text not null check (reason in ('incorrect', 'inappropriate', 'duplicate', 'spam', 'other')),
  details     text check (details is null or char_length(details) <= 1000),
  status      public.report_status not null default 'open',
  admin_note  text check (admin_note is null or char_length(admin_note) <= 1000),
  resolved_by uuid references auth.users (id) on delete set null,
  resolved_at timestamptz,
  created_at  timestamptz not null default now(),
  unique (problem_id, reporter_id)
);
create index problem_reports_status_idx on public.problem_reports (status, created_at desc);

create table public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  kind       text not null,
  title      text not null,
  body       text not null default '',
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index notifications_user_idx on public.notifications (user_id, created_at desc);
