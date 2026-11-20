\set ON_ERROR_STOP 1
insert into auth.users (id, email, raw_user_meta_data) values
  ('00000000-0000-0000-0000-0000000000e1', 'mim.akter@gmail.com',
   '{"name":"Mim Akter","picture":"https://lh3.googleusercontent.com/a/abc","email_verified":true}'),
  ('00000000-0000-0000-0000-0000000000e2', 'mim.akter@yahoo.com', '{"full_name":"Mim Two","avatar_url":"javascript:alert(1)"}');
do $$ declare p public.profiles; q public.profiles; begin
  select * into p from public.profiles where id = '00000000-0000-0000-0000-0000000000e1';
  select * into q from public.profiles where id = '00000000-0000-0000-0000-0000000000e2';
  assert p.full_name = 'Mim Akter', 'google name used';
  assert p.avatar_url = 'https://lh3.googleusercontent.com/a/abc', 'google picture used';
  assert p.username = 'mimakter', 'username from email: ' || p.username;
  assert q.username = 'mimakter1', 'unique username';
  assert q.avatar_url is null, 'non-https avatar rejected';
  assert exists (select 1 from public.user_roles where user_id = p.id and role = 'student'), 'student role';
end $$;
delete from auth.users where id in ('00000000-0000-0000-0000-0000000000e1', '00000000-0000-0000-0000-0000000000e2');
select 'oauth tests passed' as result;
