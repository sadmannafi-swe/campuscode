-- Security & business-logic tests. Run via supabase/tests/run.sh.
-- Every block raises an exception (failing the run) if an expectation breaks.
\set ON_ERROR_STOP 1

-- ---------- fixtures (as postgres) ----------------------------------
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-00000000000a', 'alice@test.dev', '{"full_name":"Alice","terms_accepted":true}'),
  ('00000000-0000-0000-0000-00000000000b', 'bob@test.dev',   '{"full_name":"Bob"}'),
  ('00000000-0000-0000-0000-0000000000ad', 'admin@test.dev', '{"full_name":"Admin"}');
select public.bootstrap_admin('admin@test.dev');

insert into public.problem_topics (id, slug, name_en, name_bn)
values ('10000000-0000-0000-0000-000000000001', 'sec-test', 'Sec', 'সেক')
on conflict do nothing;
insert into public.problems (id, slug, title, statement, difficulty, topic_id, is_official, visibility, status)
values ('20000000-0000-0000-0000-000000000001', 'sec-test-problem', 'Security test', 'Print the sum of two numbers.',
        'easy', '10000000-0000-0000-0000-000000000001', true, 'public', 'published');
insert into public.test_cases (problem_id, input, expected_output, is_sample) values
  ('20000000-0000-0000-0000-000000000001', '1 2', '3', true),
  ('20000000-0000-0000-0000-000000000001', 'HIDDEN-IN', 'HIDDEN-OUT', false);
insert into public.saved_codes (user_id, title, language, source_code)
values ('00000000-0000-0000-0000-00000000000b', 'bob secret', 'c', 'int main(){}');

do $$ begin
  assert (select count(*) from public.profiles) = 3, 'profiles created by signup trigger';
  assert (select terms_accepted_at is not null from public.profiles where id = '00000000-0000-0000-0000-00000000000a'), 'terms recorded';
  assert (select count(*) from public.user_roles where role = 'student') = 3, 'student roles';
  assert public.is_admin('00000000-0000-0000-0000-0000000000ad'), 'bootstrap admin';
end $$;

-- ---------- as Alice (student) --------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);

do $$ begin
  assert (select count(*) from public.test_cases where problem_id = '20000000-0000-0000-0000-000000000001') = 1,
    'student sees only the sample test';
  assert not exists (select 1 from public.test_cases where expected_output = 'HIDDEN-OUT'), 'hidden output never visible';
  assert (select count(*) from public.saved_codes) = 0, 'cannot see other users snippets';
  assert not public.is_admin(), 'alice is not admin';
end $$;

do $$ begin
  begin insert into public.user_roles (user_id, role) values (auth.uid(), 'admin');
        raise exception 'FAIL: self-assigned admin';
  exception when insufficient_privilege then null; end;
  begin update public.profiles set status = 'active' where id = auth.uid();
        raise exception 'FAIL: updated protected profile column';
  exception when insufficient_privilege then null; end;
  begin insert into public.submissions (user_id, problem_id, language, source_code, verdict)
        values (auth.uid(), '20000000-0000-0000-0000-000000000001', 'c', 'x', 'accepted');
        raise exception 'FAIL: forged a verdict';
  exception when insufficient_privilege then null; end;
  begin update public.user_stats set problems_solved = 999;
        raise exception 'FAIL: modified stats';
  exception when insufficient_privilege then null; end;
  begin insert into public.user_achievements values (auth.uid(), 'first_run', now());
        raise exception 'FAIL: self-awarded achievement';
  exception when insufficient_privilege or foreign_key_violation then null; end;
  begin perform public.admin_dashboard_stats();
        raise exception 'FAIL: student called admin RPC';
  exception when insufficient_privilege then null; end;
  begin perform public.bootstrap_admin('alice@test.dev');
        raise exception 'FAIL: student called bootstrap_admin';
  exception when insufficient_privilege then null; end;
end $$;

-- allowed profile edit
update public.profiles set full_name = 'Alice R', editor_font_size = 16 where id = auth.uid();

-- authoring: tries to self-publish as an official, featured problem
insert into public.problems (id, slug, title, statement, difficulty, is_official, is_featured, visibility, status, solver_count)
values ('20000000-0000-0000-0000-0000000000a1', 'alice-problem', 'Alice problem', 'Count vowels in a string.',
        'easy', true, true, 'public', 'published', 500);
insert into public.test_cases (problem_id, input, expected_output, is_sample)
values ('20000000-0000-0000-0000-0000000000a1', 'aeb', '2', false);

do $$ declare p public.problems; begin
  select * into p from public.problems where id = '20000000-0000-0000-0000-0000000000a1';
  assert p.status = 'pending_review', 'public student problem goes to review, got ' || p.status;
  assert not p.is_official and not p.is_featured, 'cannot self-mark official/featured';
  assert p.solver_count = 0, 'counters reset';
  assert p.author_id = auth.uid(), 'author forced to caller';
  assert (select count(*) from public.test_cases where problem_id = p.id) = 1, 'author sees own hidden test';
end $$;

-- ---------- as Bob: cannot see Alice's unpublished problem ----------
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  assert not exists (select 1 from public.problems where id = '20000000-0000-0000-0000-0000000000a1'), 'pending problem hidden';
  assert not exists (select 1 from public.test_cases where problem_id = '20000000-0000-0000-0000-0000000000a1'), 'its tests hidden';
  assert (select count(*) from public.saved_codes) = 1, 'bob sees own snippet';
end $$;
update public.problems set title = 'hacked' where id = '20000000-0000-0000-0000-000000000001';
do $$ begin
  reset role;
  assert (select title from public.problems where id = '20000000-0000-0000-0000-000000000001') = 'Security test',
    'student cannot edit official problem';
end $$;

-- ---------- trusted judge path (service role) -----------------------
reset role;
set role service_role;
insert into public.code_execution_logs (user_id, kind, language, status, source_size)
values ('00000000-0000-0000-0000-00000000000a', 'run', 'c', 'Accepted', 10);
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count, time_ms)
values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'c', 'x', 'wrong_answer', 1, 2, 10),
       ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'c', 'x', 'accepted', 2, 2, 8),
       ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-000000000001', 'c', 'x', 'accepted', 2, 2, 5);
-- solving one's own (unpublished) problem must not count
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count)
values ('00000000-0000-0000-0000-00000000000a', '20000000-0000-0000-0000-0000000000a1', 'c', 'x', 'accepted', 1, 1);
reset role;

do $$ declare s public.user_stats; p public.problems; begin
  select * into s from public.user_stats where user_id = '00000000-0000-0000-0000-00000000000a';
  assert s.total_runs = 1, 'runs counted';
  assert s.total_submissions = 4, 'submissions counted';
  assert s.accepted_submissions = 3, 'accepted counted';
  assert s.problems_solved = 1, 'solved counts only published, non-own problems; got ' || s.problems_solved;
  assert s.current_streak = 1 and s.longest_streak = 1, 'streak started';
  select * into p from public.problems where id = '20000000-0000-0000-0000-000000000001';
  assert p.submission_count = 3 and p.accepted_count = 2 and p.solver_count = 1, 'problem counters';
  assert (select best_time_ms from public.user_problem_progress
          where user_id = s.user_id and problem_id = p.id) = 5, 'best time tracked';
end $$;

-- streak continues from yesterday
update public.user_stats set last_active_date = public.activity_today() - 1, current_streak = 6, longest_streak = 6
 where user_id = '00000000-0000-0000-0000-00000000000a';
set role service_role;
insert into public.code_execution_logs (user_id, kind, language, status) values ('00000000-0000-0000-0000-00000000000a', 'run', 'python', 'Accepted');
reset role;
do $$ begin
  assert (select current_streak from public.user_stats where user_id = '00000000-0000-0000-0000-00000000000a') = 7, 'streak +1';
  if exists (select 1 from public.achievements) then   -- seeded
    assert (select array_agg(achievement_id order by achievement_id) from public.user_achievements
            where user_id = '00000000-0000-0000-0000-00000000000a') = array['first_accepted', 'first_run', 'streak_7'],
      'achievements awarded by trusted triggers';
    assert exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'achievement'),
      'achievement notification';
  end if;
end $$;

-- lesson completion is one-way and counted server-side
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', false);
do $$ declare lid uuid; begin
  select id into lid from public.lessons where is_published limit 1;
  if lid is null then return; end if;
  insert into public.lesson_progress (user_id, lesson_id, state) values (auth.uid(), lid, 'completed');
  update public.lesson_progress set state = 'started' where lesson_id = lid and user_id = auth.uid();
  assert (select state from public.lesson_progress where lesson_id = lid and user_id = auth.uid()) = 'completed', 'cannot un-complete';
  assert (select lessons_completed from public.user_stats where user_id = auth.uid()) = 1, 'lesson counted once';
  assert (select count(*) from public.get_topic_progress()) >= 8, 'topic progress rpc';
  assert (select completed from public.get_course_progress() where total = 32) = 1, 'course progress rpc';
  assert exists (select 1 from public.get_daily_problem()), 'daily problem rpc';
end $$;
reset role;

-- ---------- admin path ----------------------------------------------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ad', false);
do $$ declare j json; begin
  j := public.admin_dashboard_stats();
  assert (j ->> 'total_users')::int = 3, 'admin stats';
  assert (j ->> 'pending_problems')::int = 1, 'pending count';
  assert (select count(*) from public.admin_list_users('alice')) = 1, 'admin user search';
  perform public.admin_moderate_problem('20000000-0000-0000-0000-0000000000a1', 'published', 'Looks good');
  perform public.admin_set_user_status('00000000-0000-0000-0000-00000000000b', 'suspended');
  begin perform public.admin_set_role(auth.uid(), 'admin', false);
        raise exception 'FAIL: admin removed own role';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
do $$ begin
  assert (select status from public.problems where id = '20000000-0000-0000-0000-0000000000a1') = 'published', 'moderated';
  assert (select published_at is not null from public.problems where id = '20000000-0000-0000-0000-0000000000a1'), 'published_at';
  assert exists (select 1 from public.notifications where user_id = '00000000-0000-0000-0000-00000000000a' and kind = 'moderation'), 'author notified';
end $$;

-- suspended user cannot create content
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000b', false);
do $$ begin
  begin insert into public.saved_codes (user_id, title, language, source_code) values (auth.uid(), 'x', 'c', '');
        raise exception 'FAIL: suspended user saved code';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- cleanup fixtures so seed data stays pristine
delete from public.problems where id in ('20000000-0000-0000-0000-000000000001', '20000000-0000-0000-0000-0000000000a1');
delete from public.problem_topics where id = '10000000-0000-0000-0000-000000000001';
delete from auth.users where email like '%@test.dev';
select 'security tests passed' as result;
