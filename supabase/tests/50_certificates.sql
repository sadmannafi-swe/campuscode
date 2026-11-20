\set ON_ERROR_STOP 1
-- Certificates of Completion: eligibility, issuance, idempotency, verification, revocation, access.
-- Fixture: two small test courses with their own lessons, practice and assessment problems.
-- Submissions are inserted as the database owner, exactly like the `submit` Edge Function (service role).

insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000c1', 'cert-a@test.dev', '{"full_name":"Ayesha Rahman"}'),
  ('00000000-0000-0000-0000-0000000000c2', 'cert-b@test.dev', '{"full_name":"Bilal Hossain"}'),
  ('00000000-0000-0000-0000-0000000000c3', 'cert-c@test.dev', '{"full_name":"Chaitee Das"}'),
  ('00000000-0000-0000-0000-0000000000c4', 'cert-d@test.dev', '{"full_name":"Dipu Saha"}'),
  ('00000000-0000-0000-0000-0000000000ca', 'cert-admin@test.dev', '{"full_name":"Cert Admin"}');
insert into public.user_roles (user_id, role) values ('00000000-0000-0000-0000-0000000000ca', 'admin');

insert into public.courses (id, slug, language, title_en, title_bn, is_published) values
  ('00000000-0000-0000-0000-00000000c0a1', 'cert-test-a', 'c', 'Certificate Test Course A', 'ক', true),
  ('00000000-0000-0000-0000-00000000c0b1', 'cert-test-b', 'python', 'Certificate Test Course B', 'খ', true);
insert into public.chapters (id, course_id, slug, title_en, title_bn) values
  ('00000000-0000-0000-0000-00000000c1a1', '00000000-0000-0000-0000-00000000c0a1', 'ch-a', 'A', 'A'),
  ('00000000-0000-0000-0000-00000000c1b1', '00000000-0000-0000-0000-00000000c0b1', 'ch-b', 'B', 'B');
insert into public.lessons (id, course_id, chapter_id, slug, number, title_en, title_bn, is_published) values
  ('00000000-0000-0000-0000-00000000c2a1', '00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c1a1', 'a-one', 1, 'A1', 'A1', true),
  ('00000000-0000-0000-0000-00000000c2a2', '00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c1a1', 'a-two', 2, 'A2', 'A2', true),
  ('00000000-0000-0000-0000-00000000c2a3', '00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c1a1', 'a-draft', 3, 'A3', 'A3', false),
  ('00000000-0000-0000-0000-00000000c2b1', '00000000-0000-0000-0000-00000000c0b1', '00000000-0000-0000-0000-00000000c1b1', 'b-one', 1, 'B1', 'B1', true);
insert into public.problems (id, slug, title, statement, difficulty, status, visibility, is_official) values
  ('00000000-0000-0000-0000-00000000c3a1', 'cert-a-practice', 'Cert A practice', 'Practice statement text', 'easy', 'published', 'public', true),
  ('00000000-0000-0000-0000-00000000c3a2', 'cert-a-final', 'Cert A final', 'Assessment statement text', 'medium', 'published', 'public', true),
  ('00000000-0000-0000-0000-00000000c3b1', 'cert-b-practice', 'Cert B practice', 'Practice statement text', 'easy', 'published', 'public', true),
  ('00000000-0000-0000-0000-00000000c3b2', 'cert-b-final', 'Cert B final', 'Assessment statement text', 'medium', 'published', 'public', true);

create temp table ids as select
  '00000000-0000-0000-0000-0000000000c1'::uuid as ua, '00000000-0000-0000-0000-0000000000c2'::uuid as ub,
  '00000000-0000-0000-0000-0000000000c3'::uuid as uc, '00000000-0000-0000-0000-0000000000c4'::uuid as ud,
  '00000000-0000-0000-0000-00000000c0a1'::uuid as ca, '00000000-0000-0000-0000-00000000c0b1'::uuid as cb;
grant select on ids to anon, authenticated;

-- ---------- Not configured → nothing is issued, and the gap is reported ----------
do $$ declare e jsonb; begin
  e := public.course_certificate_config('00000000-0000-0000-0000-00000000c0a1');
  assert not (e->>'configured')::boolean, 'unconfigured course';
  assert e->'missing' ?& array['certificates_disabled', 'no_practice_requirements', 'no_final_assessment'], 'missing list: ' || (e->'missing')::text;
  assert (e->>'lessons')::int = 2, 'only published lessons count (draft excluded)';
end $$;

-- pass mark can never go below 70 %
do $$ begin
  begin
    insert into public.course_certificate_settings (course_id, enabled, passing_score) values ('00000000-0000-0000-0000-00000000c0a1', true, 69);
    raise exception 'FAIL: passing_score 69 accepted';
  exception when check_violation then null; end;
end $$;

-- Student A completes all lessons + solves everything BEFORE assessment is configured: no certificate.
insert into public.course_certificate_settings (course_id, enabled) values
  ('00000000-0000-0000-0000-00000000c0a1', true), ('00000000-0000-0000-0000-00000000c0b1', true);
insert into public.course_requirement_problems (course_id, problem_id, kind) values
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c3a1', 'practice');

-- ---------- Scenario 1: incomplete lessons → no certificate ----------
insert into public.course_requirement_problems (course_id, problem_id, kind) values
  ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c3a2', 'assessment'),
  ('00000000-0000-0000-0000-00000000c0b1', '00000000-0000-0000-0000-00000000c3b1', 'practice'),
  ('00000000-0000-0000-0000-00000000c0b1', '00000000-0000-0000-0000-00000000c3b2', 'assessment');
do $$ begin
  assert (public.course_certificate_config('00000000-0000-0000-0000-00000000c0a1')->>'configured')::boolean, 'course A configured now';
end $$;

set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
insert into public.lesson_progress (user_id, lesson_id, state) values (auth.uid(), '00000000-0000-0000-0000-00000000c2a1', 'completed');
reset role;
-- judge: practice solved, assessment 100 %
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c3a1', 'c', 'x', 'accepted', 5, 5),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c3a2', 'c', 'x', 'accepted', 10, 10);
do $$ declare e jsonb; begin
  assert not exists (select 1 from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1'),
    'S1: 1/2 lessons → no certificate';
  e := public.certificate_eligibility('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c0a1');
  assert (e #>> '{lessons,done}')::int = 1 and not (e->>'eligible')::boolean, 'S1 eligibility: ' || e::text;
end $$;

-- watching (video) is not lesson completion; a 'started' lesson does not count either
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
insert into public.lesson_progress (user_id, lesson_id, state) values (auth.uid(), '00000000-0000-0000-0000-00000000c2a2', 'started');
reset role;
do $$ begin
  assert not exists (select 1 from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1'), 'started ≠ completed';
end $$;

-- completing the last lesson issues the certificate automatically (Scenario 5: score 100 % > 70 %)
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
update public.lesson_progress set state = 'completed' where user_id = auth.uid() and lesson_id = '00000000-0000-0000-0000-00000000c2a2';
reset role;
do $$ declare c public.certificates; begin
  select * into c from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1';
  assert found, 'S5: certificate issued when the last lesson is completed';
  assert c.status = 'valid' and c.final_score = 100 and c.student_name = 'Ayesha Rahman'
     and c.course_title = 'Certificate Test Course A', 'snapshot fields: ' || to_jsonb(c)::text;
  assert c.certificate_number ~ '^CC-[0-9]{4}-[A-HJ-NP-Z2-9]{8}$', 'number format ' || c.certificate_number;
  assert c.verification_token ~ '^[A-Za-z0-9_-]{32}$', 'token format';
  assert (select count(*) from public.notifications where user_id = c.user_id and kind = 'certificate') = 1, 'one notification';
  assert (select count(*) from public.certificate_events where certificate_id = c.id and event = 'issued') = 1, 'issued event logged';
end $$;

-- ---------- Scenario 6: repeated issuance → no duplicate ----------
do $$ declare first uuid; again uuid; begin
  select id into first from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1';
  again := public.issue_certificate_if_eligible('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c0a1');
  again := public.issue_certificate_if_eligible('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c0a1');
  assert again = first, 'same certificate returned';
  assert (select count(*) from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1') = 1, 'still one';
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000c1' and kind = 'certificate') = 1, 'no duplicate notification';
  -- more submissions on the same problems never create another one
  insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count)
  values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c3a2', 'c', 'y', 'accepted', 10, 10);
  assert (select count(*) from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1') = 1, 'still one after resubmit';
  begin
    insert into public.certificates (user_id, course_id, certificate_number, verification_token, student_name, course_title, final_score)
    values ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c0a1', 'CC-2026-AAAAAAAA', repeat('a', 32), 'x', 'y', 90);
    raise exception 'FAIL: duplicate (user, course) accepted';
  exception when unique_violation then null; end;
end $$;

-- ---------- Scenario 7: same student, another course → separate certificate ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
insert into public.lesson_progress (user_id, lesson_id, state) values (auth.uid(), '00000000-0000-0000-0000-00000000c2b1', 'completed');
reset role;
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count) values
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c3b1', 'python', 'x', 'accepted', 3, 3),
  ('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c3b2', 'python', 'x', 'wrong_answer', 8, 10);
do $$ begin
  assert (select count(*) from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1') = 2, 'S7: two courses → two certificates';
  assert (select count(distinct certificate_number) from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1') = 2, 'distinct numbers';
  assert (select final_score from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c1'
            and course_id = '00000000-0000-0000-0000-00000000c0b1') = 80, '80 % recorded';
end $$;

-- ---------- Scenario 2: incomplete required practice → no certificate ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false);
insert into public.lesson_progress (user_id, lesson_id, state) values
  (auth.uid(), '00000000-0000-0000-0000-00000000c2a1', 'completed'), (auth.uid(), '00000000-0000-0000-0000-00000000c2a2', 'completed');
reset role;
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count) values
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000c3a1', 'c', 'x', 'wrong_answer', 4, 5),
  ('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000c3a2', 'c', 'x', 'accepted', 10, 10);
do $$ declare e jsonb; begin
  assert not exists (select 1 from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c2'), 'S2: practice unsolved → none';
  e := public.certificate_eligibility('00000000-0000-0000-0000-0000000000c2', '00000000-0000-0000-0000-00000000c0a1');
  assert (e #>> '{practice,done}')::int = 0 and (e #>> '{assessment,passed}')::boolean, 'S2 detail ' || e::text;
end $$;

-- ---------- Scenario 3: final score 69 % → no certificate ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c3', false);
insert into public.lesson_progress (user_id, lesson_id, state) values
  (auth.uid(), '00000000-0000-0000-0000-00000000c2a1', 'completed'), (auth.uid(), '00000000-0000-0000-0000-00000000c2a2', 'completed');
reset role;
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000c3a1', 'c', 'x', 'accepted', 5, 5),
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000c3a2', 'c', 'x', 'wrong_answer', 69, 100);
do $$ declare e jsonb; begin
  e := public.certificate_eligibility('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000c0a1');
  assert (e #>> '{assessment,score}')::numeric = 69, 'score 69: ' || e::text;
  assert not exists (select 1 from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c3'), 'S3: 69 % → none';
end $$;

-- ---------- Scenario 4: exactly 70 % (all else satisfied) → issued ----------
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count) values
  ('00000000-0000-0000-0000-0000000000c3', '00000000-0000-0000-0000-00000000c3a2', 'c', 'x', 'wrong_answer', 7, 10);
do $$ declare c public.certificates; begin
  select * into c from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c3';
  assert found and c.final_score = 70, 'S4: exactly 70 % → issued';
end $$;

-- Display name is required (the certificate shows it).
update public.profiles set full_name = '' where id = '00000000-0000-0000-0000-0000000000c4';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c4', false);
insert into public.lesson_progress (user_id, lesson_id, state) values (auth.uid(), '00000000-0000-0000-0000-00000000c2b1', 'completed');
reset role;
insert into public.submissions (user_id, problem_id, language, source_code, verdict, passed_count, total_count) values
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000c3b1', 'python', 'x', 'accepted', 3, 3),
  ('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000c3b2', 'python', 'x', 'accepted', 10, 10);
do $$ begin
  assert not exists (select 1 from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c4'), 'no name → none';
  assert not (public.certificate_eligibility('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000c0b1')->>'name_present')::boolean, 'name flag';
end $$;
update public.profiles set full_name = 'Dipu Saha' where id = '00000000-0000-0000-0000-0000000000c4';
do $$ begin
  assert public.issue_certificate_if_eligible('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000c0b1') is not null,
    'after adding a name, a re-check issues it';
end $$;

-- Concurrency: the advisory lock + unique(user, course) serialise racing issuers (same txn re-entry is safe too).
do $$ declare a uuid; b uuid; begin
  a := public.issue_certificate_if_eligible('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000c0b1');
  b := public.issue_certificate_if_eligible('00000000-0000-0000-0000-0000000000c4', '00000000-0000-0000-0000-00000000c0b1');
  assert a = b, 'idempotent under re-entry';
end $$;

-- ---------- Scenario 14: students cannot read or touch other students' certificates ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c2', false);
do $$ begin
  assert (select count(*) from public.certificates) = 0, 'B sees no certificates (A''s are hidden)';
  assert (select count(*) from public.certificate_events) = 0, 'events hidden from students';
  begin
    insert into public.certificates (user_id, course_id, certificate_number, verification_token, student_name, course_title, final_score)
    values (auth.uid(), '00000000-0000-0000-0000-00000000c0a1', 'CC-2026-BBBBBBBB', repeat('b', 32), 'B', 'C', 100);
    raise exception 'FAIL: student self-issued';
  exception when insufficient_privilege then null; end;
  begin
    perform public.issue_certificate_if_eligible(auth.uid(), '00000000-0000-0000-0000-00000000c0a1');
    raise exception 'FAIL: student called issuer';
  exception when insufficient_privilege then null; end;
  begin
    perform public.certificate_eligibility('00000000-0000-0000-0000-0000000000c1', '00000000-0000-0000-0000-00000000c0a1');
    raise exception 'FAIL: student read another user''s eligibility';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.admin_list_certificates();
    raise exception 'FAIL: student listed certificates';
  exception when insufficient_privilege then null; end;
  begin
    perform public.admin_revoke_certificate((select id from public.certificates limit 1), 'nope nope');
    raise exception 'FAIL: student revoked';
  exception when insufficient_privilege then null; end;
  begin
    insert into public.course_requirement_problems (course_id, problem_id, kind)
    values ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c3b1', 'practice');
    raise exception 'FAIL: student changed requirements';
  exception when insufficient_privilege then null; end;
  -- own progress only, no score from the client is ever read
  assert (public.get_my_certificate_progress('00000000-0000-0000-0000-00000000c0a1') #>> '{practice,done}')::int = 0, 'own progress';
end $$;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
do $$ begin
  assert (select count(*) from public.certificates) = 2, 'A sees exactly own two';
  assert (public.get_my_certificate_progress('00000000-0000-0000-0000-00000000c0a1') #>> '{certificate,status}') = 'valid', 'own cert in progress';
  begin
    update public.certificates set status = 'revoked' where user_id = auth.uid();
    raise exception 'FAIL: student modified certificate';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

-- ---------- Scenarios 8–10, 15: public verification ----------
set role anon;
do $$ declare tok text; r record; begin
  reset role; select verification_token into tok from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c3'; set role anon;
  select * into r from public.verify_certificate(tok);
  assert r.status = 'valid' and r.student_name = 'Chaitee Das' and r.course_title = 'Certificate Test Course A'
     and r.issuing_platform = 'CampusCode' and r.certificate_number like 'CC-%' and r.issued_at is not null, 'S8 valid: ' || row_to_json(r)::text;
  select * into r from public.verify_certificate('ThisTokenDoesNotExist_0123456789');
  assert r.status = 'not_found' and r.student_name is null, 'S10 unknown token';
  select * into r from public.verify_certificate('../../etc');
  assert r.status = 'not_found', 'S10 malformed token';
  begin
    perform 1 from public.certificates;
    raise exception 'FAIL: anon read certificates table';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
-- S15: the verification result has no private columns at all
do $$ begin
  assert (select string_agg(a, ',') from unnest(
            (select proargnames from pg_proc where oid = 'public.verify_certificate(text)'::regprocedure)) a)
         = 'p_token,status,student_name,course_title,certificate_number,issued_at,issuing_platform',
         'verification exposes only safe fields';
end $$;

-- ---------- Scenario 9: revoked certificate no longer verifies as valid ----------
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000ca', false);
do $$ declare cid uuid; tok text; r record; n int; begin
  select id, verification_token into cid, tok from public.certificates where user_id = '00000000-0000-0000-0000-0000000000c3';
  assert (select count(*) from public.admin_list_certificates('Chaitee')) = 1, 'admin search by student';
  assert (select count(*) from public.admin_list_certificates('', '00000000-0000-0000-0000-00000000c0b1')) = 2, 'admin filter by course';
  begin
    perform public.admin_revoke_certificate(cid, ' ');
    raise exception 'FAIL: revoked without reason';
  exception when invalid_parameter_value then null; end;
  perform public.admin_revoke_certificate(cid, 'Assessment was completed by someone else.');
  select * into r from public.verify_certificate(tok);
  assert r.status = 'revoked', 'S9 revoked shows revoked';
  assert (select count(*) from public.admin_list_certificates('', null, 'revoked')) = 1, 'admin filter by status';
  assert jsonb_array_length(public.admin_certificate_detail(cid)->'events') = 2, 'issued + revoked events';
  begin
    perform public.admin_revoke_certificate(cid, 'again again');
    raise exception 'FAIL: double revoke';
  exception when invalid_parameter_value then null; end;
  n := public.admin_issue_eligible_certificates('00000000-0000-0000-0000-00000000c0a1');
  assert n = 0, 'bulk issue: nobody new qualifies, revoked one is not re-issued';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.notifications where user_id = '00000000-0000-0000-0000-0000000000c3' and title like 'Certificate revoked%') = 1, 'student told about revocation';
  begin
    update public.certificates set status = 'valid' where user_id = '00000000-0000-0000-0000-0000000000c3';
    raise exception 'FAIL: inconsistent un-revoke accepted';
  exception when check_violation then null; end;
end $$;

-- clean up fixture
delete from public.certificates where course_id in ('00000000-0000-0000-0000-00000000c0a1', '00000000-0000-0000-0000-00000000c0b1');
delete from auth.users where email like 'cert-%@test.dev';
delete from public.problems where slug like 'cert-%';
delete from public.courses where slug like 'cert-test-%';
select 'certificate tests passed' as result;
