-- =====================================================================
-- Google sign-in: build the profile from the provider's metadata.
-- Google sends name/full_name and picture/avatar_url; email sign-up sends full_name.
-- =====================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  base_name text;
  candidate text;
  n int := 0;
  display_name text;
  avatar text;
begin
  base_name := lower(regexp_replace(
    coalesce(nullif(meta ->> 'username', ''), split_part(new.email, '@', 1), 'coder'),
    '[^a-zA-Z0-9_]', '', 'g'));
  if char_length(base_name) < 3 then base_name := base_name || 'coder'; end if;
  base_name := left(base_name, 18);
  candidate := base_name;
  while exists (select 1 from public.profiles where username = candidate) loop
    n := n + 1;
    candidate := base_name || n::text;
  end loop;

  display_name := left(coalesce(nullif(meta ->> 'full_name', ''), nullif(meta ->> 'name', ''), ''), 80);
  avatar := coalesce(nullif(meta ->> 'avatar_url', ''), nullif(meta ->> 'picture', ''));
  if avatar is not null and (avatar !~ '^https://' or char_length(avatar) > 500) then avatar := null; end if;

  insert into public.profiles (id, username, full_name, avatar_url, preferred_language, terms_accepted_at)
  values (
    new.id,
    candidate,
    display_name,
    avatar,
    case when meta ->> 'preferred_language' = 'bn' then 'bn' else 'en' end,
    case when (meta ->> 'terms_accepted')::boolean then now() else null end
  );
  insert into public.user_stats (user_id) values (new.id) on conflict do nothing;
  insert into public.user_roles (user_id, role) values (new.id, 'student') on conflict do nothing;
  return new;
end $$;

revoke all on function public.handle_new_user() from public, anon, authenticated;
