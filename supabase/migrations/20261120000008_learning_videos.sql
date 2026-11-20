-- =====================================================================
-- Lesson videos (YouTube) and per-student video progress.
-- * Only YouTube video IDs are stored — never embed HTML.
-- * lesson_id NULL = a course-level video (e.g. the course introduction).
-- * Progress is per student; watched time is capped server-side so it cannot grow faster
--   than real playback (max 2x speed), and completion is derived from it, not set by clients.
-- * Watching a video never marks the lesson itself complete.
-- =====================================================================
create table public.learning_videos (
  id                 uuid primary key default gen_random_uuid(),
  course_id          uuid not null references public.courses (id) on delete cascade,
  lesson_id          uuid references public.lessons (id) on delete cascade,
  provider           text not null default 'youtube' check (provider = 'youtube'),
  youtube_video_id   text not null check (youtube_video_id ~ '^[A-Za-z0-9_-]{11}$'),
  source_playlist_id text check (source_playlist_id is null or source_playlist_id ~ '^[A-Za-z0-9_-]{10,64}$'),
  playlist_position  int check (playlist_position is null or playlist_position > 0),
  title              text not null check (char_length(title) between 1 and 200),
  channel_name       text check (channel_name is null or char_length(channel_name) <= 120),
  duration_seconds   int check (duration_seconds is null or duration_seconds > 0),
  note_en            text check (note_en is null or char_length(note_en) <= 2000),
  note_bn            text check (note_bn is null or char_length(note_bn) <= 2000),
  sort_order         int not null default 0,
  is_published       boolean not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  unique (lesson_id, youtube_video_id)
);
create unique index learning_videos_course_intro_uq on public.learning_videos (course_id, youtube_video_id) where lesson_id is null;
create index learning_videos_lesson_idx on public.learning_videos (lesson_id, sort_order);
create index learning_videos_course_idx on public.learning_videos (course_id);
create trigger learning_videos_updated_at before update on public.learning_videos
  for each row execute function public.set_updated_at();

-- A lesson video must belong to the lesson's own course.
create or replace function public.guard_learning_video()
returns trigger language plpgsql set search_path = public
as $$
begin
  if new.lesson_id is not null and not exists (
    select 1 from public.lessons l where l.id = new.lesson_id and l.course_id = new.course_id) then
    raise exception 'lesson % does not belong to course %', new.lesson_id, new.course_id using errcode = '23514';
  end if;
  return new;
end $$;
create trigger learning_videos_guard before insert or update on public.learning_videos
  for each row execute function public.guard_learning_video();

create table public.video_progress (
  user_id          uuid not null references auth.users (id) on delete cascade,
  video_id         uuid not null references public.learning_videos (id) on delete cascade,
  position_seconds int not null default 0 check (position_seconds >= 0),
  watched_seconds  int not null default 0 check (watched_seconds >= 0),
  started_at       timestamptz not null default now(),
  completed_at     timestamptz,
  updated_at       timestamptz not null default now(),
  primary key (user_id, video_id)
);
create index video_progress_user_idx on public.video_progress (user_id, updated_at desc);

create or replace function public.guard_video_progress()
returns trigger language plpgsql set search_path = public
as $$
declare
  dur int;
  max_gain int;
begin
  select duration_seconds into dur from public.learning_videos where id = new.video_id;
  if tg_op = 'INSERT' then
    new.started_at := now();
    new.watched_seconds := least(new.watched_seconds, 30);
    new.completed_at := null;
  else
    new.user_id := old.user_id;
    new.video_id := old.video_id;
    new.started_at := old.started_at;
    -- watched time only grows, and at most 2x wall-clock time since the last save (+10 s slack)
    max_gain := ceil(extract(epoch from (now() - old.updated_at)) * 2)::int + 10;
    new.watched_seconds := greatest(old.watched_seconds, least(new.watched_seconds, old.watched_seconds + max_gain));
    new.completed_at := old.completed_at;
  end if;
  if dur is not null then
    new.watched_seconds := least(new.watched_seconds, dur);
    new.position_seconds := least(new.position_seconds, dur);
    if new.completed_at is null and new.watched_seconds >= ceil(dur * 0.9) then
      new.completed_at := now();
    end if;
  end if;
  new.updated_at := now();
  return new;
end $$;
create trigger video_progress_guard before insert or update on public.video_progress
  for each row execute function public.guard_video_progress();

-- ---------- RLS ------------------------------------------------------
alter table public.learning_videos enable row level security;
alter table public.video_progress  enable row level security;

create policy "learning_videos: read published" on public.learning_videos
  for select to anon, authenticated
  using ((is_published and (
            (lesson_id is null and exists (select 1 from public.courses c where c.id = course_id and c.is_published))
            or exists (select 1 from public.lessons l where l.id = lesson_id)))   -- lessons RLS applies
         or (select public.is_admin()));
create policy "learning_videos: admin write" on public.learning_videos
  for all to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

create policy "video_progress: read own" on public.video_progress
  for select to authenticated using (user_id = (select auth.uid()));
create policy "video_progress: insert own" on public.video_progress
  for insert to authenticated
  with check (user_id = (select auth.uid())
              and exists (select 1 from public.learning_videos v where v.id = video_id and v.is_published));
create policy "video_progress: update own" on public.video_progress
  for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke delete on public.video_progress from anon, authenticated;
