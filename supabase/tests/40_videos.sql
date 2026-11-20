\set ON_ERROR_STOP 1
-- mapping integrity (seeded)
do $$ begin
  assert (select count(*) from public.learning_videos) = 33, 'all 33 playlist videos stored';
  assert (select count(*) from public.learning_videos where lesson_id is null) = 1, 'one course intro';
  assert (select count(distinct lesson_id) from public.learning_videos where lesson_id is not null) = 32, 'every lesson mapped once';
  assert not exists (select 1 from public.learning_videos v join public.lessons l on l.id = v.lesson_id
                     where v.playlist_position <> l.number + 1), 'playlist order matches lesson order';
  assert (select note_en is not null from public.learning_videos where youtube_video_id = 'YiSSRggLTg0'), 'else-if correction note';
end $$;

-- a lesson video cannot point at another course's lesson
do $$ begin
  begin
    insert into public.learning_videos (course_id, lesson_id, youtube_video_id, title)
    select (select id from public.courses where slug = 'python-programming'),
           (select id from public.lessons where slug = 'for-loop'), 'aaaaaaaaaaa', 'x';
    raise exception 'FAIL: cross-course video accepted';
  exception when check_violation then null; end;
end $$;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000f1', 'viewer@test.dev');
set role anon;
do $$ begin
  assert (select count(*) from public.learning_videos) = 33, 'anon can read published videos';
end $$;
reset role;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000f1', false);
do $$ declare vid uuid; dur int; p public.video_progress; begin
  select id, duration_seconds into vid, dur from public.learning_videos where youtube_video_id = 'U6SfSl3Nf-g'; -- 393 s
  insert into public.video_progress (user_id, video_id, position_seconds, watched_seconds) values (auth.uid(), vid, 5, 9999);
  select * into p from public.video_progress where video_id = vid and user_id = auth.uid();
  assert p.watched_seconds = 30, 'insert capped at 30s, got ' || p.watched_seconds;
  -- claiming the whole video one second later is rejected (max 2x wall clock + 10 s slack)
  update public.video_progress set watched_seconds = dur, position_seconds = dur where video_id = vid and user_id = auth.uid();
  select * into p from public.video_progress where video_id = vid and user_id = auth.uid();
  assert p.watched_seconds < 60, 'inflation blocked, got ' || p.watched_seconds;
  assert p.completed_at is null, 'not completed';
  assert p.position_seconds = dur, 'resume position may jump (seeking is allowed)';
  begin delete from public.video_progress where user_id = auth.uid();
        raise exception 'FAIL: deleted progress';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- simulate genuine watching over time: completion is derived server-side at 90%
alter table public.video_progress disable trigger video_progress_guard;   -- test-only: backdate the last save
update public.video_progress set updated_at = now() - interval '10 minutes' where user_id = '00000000-0000-0000-0000-0000000000f1';
alter table public.video_progress enable trigger video_progress_guard;
set role authenticated;
do $$ declare p public.video_progress; begin
  update public.video_progress set watched_seconds = 360 where user_id = auth.uid();
  select * into p from public.video_progress where user_id = auth.uid();
  assert p.watched_seconds = 360 and p.completed_at is not null, 'completed at >=90% of 393s';
  assert not exists (select 1 from public.lesson_progress where user_id = auth.uid() and state = 'completed'),
    'watching a video does not complete the lesson';
end $$;
reset role;
delete from auth.users where email = 'viewer@test.dev';
select 'video tests passed' as result;
