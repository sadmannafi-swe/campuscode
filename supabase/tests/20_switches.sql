\set ON_ERROR_STOP 1
insert into auth.users (id, email) values ('00000000-0000-0000-0000-0000000000c1', 'carol@test.dev');
insert into public.platform_settings (key, value) values ('community.problems_enabled', 'false')
  on conflict (key) do update set value = 'false';
set role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-0000000000c1', false);
do $$ begin
  begin
    insert into public.problems (slug, title, statement, difficulty) values ('carol-x', 'Carol', 'A statement here.', 'easy');
    raise exception 'FAIL: created problem while community problems disabled';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
update public.platform_settings set value = 'true' where key = 'community.problems_enabled';
set role authenticated;
insert into public.problems (slug, title, statement, difficulty) values ('carol-y', 'Carol', 'A statement here.', 'easy');
reset role;
delete from public.problems where slug = 'carol-y';
delete from auth.users where email = 'carol@test.dev';
select 'switch tests passed' as result;
