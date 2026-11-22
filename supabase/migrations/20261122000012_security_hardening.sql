-- Security hardening (audit 2026-11-22)
--
-- 1. Administrator bootstrap is protected by a deployment-controlled one-time secret.
--    Before: while no administrator existed, ANY verified Google account could claim the single admin slot at
--    /ccadmingo (first come, first served) — e.g. right after a deployment, or after the owner reopened setup to
--    transfer the role. Now claim_initial_admin() also requires a one-time setup token that only the project owner
--    can mint (SQL editor / service connection; never exposed through the API). Only a SHA-256 hash is stored, the
--    token expires (default 30 minutes), is consumed by the successful claim, and with no token minted setup is
--    closed. Once an administrator exists, tokens cannot be minted at all.
--    The existing administrator row is NOT touched by this migration.
--
-- 2. Least-privilege table grants. Supabase's default grants gave anon INSERT/UPDATE/DELETE and anon+authenticated
--    TRUNCATE on every public table. RLS already blocked the row writes (no policy targets anon) but TRUNCATE is
--    not subject to RLS at all, so these privileges are removed as defence in depth (also for future tables).

-- ------------------------------------------------------------------ private schema (not exposed by PostgREST)
create schema if not exists private;
revoke all on schema private from public;
do $$ begin
  if exists (select from pg_roles where rolname = 'anon') then execute 'revoke all on schema private from anon, authenticated'; end if;
end $$;

create table if not exists private.admin_setup_token (
  singleton   boolean primary key default true check (singleton),
  token_hash  bytea not null,
  expires_at  timestamptz not null,
  created_at  timestamptz not null default now()
);
revoke all on private.admin_setup_token from public;

-- Owner-only: mints a one-time setup token and returns it ONCE (only its hash is stored).
--   select private.issue_admin_setup_token();                       -- valid 30 minutes
--   select private.issue_admin_setup_token(interval '10 minutes');
create or replace function private.issue_admin_setup_token(p_valid interval default interval '30 minutes')
returns text language plpgsql volatile security definer set search_path = public, extensions, private
as $$
declare tok text;
begin
  if exists (select 1 from public.admin_identity) then
    raise exception 'admin_already_claimed: an administrator already exists; setup cannot be reopened with a token';
  end if;
  if p_valid is null or p_valid <= interval '0' or p_valid > interval '24 hours' then
    raise exception 'invalid_validity: choose between 1 second and 24 hours';
  end if;
  tok := translate(encode(gen_random_bytes(32), 'base64'), '+/=', '-_');
  insert into private.admin_setup_token (singleton, token_hash, expires_at)
  values (true, sha256(convert_to(tok, 'UTF8')), now() + p_valid)
  on conflict (singleton) do update set token_hash = excluded.token_hash, expires_at = excluded.expires_at, created_at = now();
  return tok;
end $$;

-- Owner-only: withdraws an unused token.
create or replace function private.revoke_admin_setup_token()
returns void language sql volatile security definer set search_path = private
as $$ delete from private.admin_setup_token; $$;

revoke all on function private.issue_admin_setup_token(interval) from public;
revoke all on function private.revoke_admin_setup_token() from public;
do $$ begin
  if exists (select from pg_roles where rolname = 'anon') then
    execute 'revoke all on function private.issue_admin_setup_token(interval) from anon, authenticated';
    execute 'revoke all on function private.revoke_admin_setup_token() from anon, authenticated';
  end if;
end $$;

-- ------------------------------------------------------------------ claim requires the token
drop function if exists public.claim_initial_admin();

create or replace function public.claim_initial_admin(p_token text)
returns jsonb language plpgsql volatile security definer set search_path = public, extensions, private
as $$
declare me uuid := auth.uid(); u record; verified boolean; n int; t record;
begin
  if me is null then raise exception 'auth_required' using errcode = '42501'; end if;
  if exists (select 1 from public.admin_identity) then
    raise exception 'admin_already_claimed' using errcode = '42501';
  end if;

  -- Deployment-controlled one-time secret. One generic error for "none minted / expired / wrong" so the
  -- endpoint reveals nothing about whether a token exists.
  select * into t from private.admin_setup_token where singleton for update;
  if not found or t.expires_at <= now() or p_token is null or length(p_token) > 200
     or sha256(convert_to(p_token, 'UTF8')) <> t.token_hash then
    raise exception 'admin_setup_token_invalid' using errcode = '42501';
  end if;

  select id, email, email_confirmed_at into u from auth.users where id = me;
  verified := u.email_confirmed_at is not null and exists (
    select 1 from auth.identities i
     where i.user_id = me and i.provider = 'google'
       and coalesce((i.identity_data->>'email_verified')::boolean, false)
       and lower(i.identity_data->>'email') = lower(u.email));
  if not verified then raise exception 'admin_requires_verified_google' using errcode = '42501'; end if;
  if not public.is_active_user(me) then raise exception 'account_suspended' using errcode = '42501'; end if;

  insert into public.admin_identity (singleton, user_id, email) values (true, me, lower(u.email))
  on conflict do nothing;
  get diagnostics n = row_count;
  if n = 0 then raise exception 'admin_already_claimed' using errcode = '42501'; end if;
  insert into public.user_roles (user_id, role, granted_by) values (me, 'admin', me) on conflict do nothing;
  delete from private.admin_setup_token;          -- one-time: consumed by the successful claim
  return jsonb_build_object('claimed', true);
end $$;

revoke all on function public.claim_initial_admin(text) from public;
do $$ begin
  if exists (select from pg_roles where rolname = 'anon') then
    execute 'revoke all on function public.claim_initial_admin(text) from anon';
    execute 'grant execute on function public.claim_initial_admin(text) to authenticated';
  end if;
end $$;

-- ------------------------------------------------------------------ least-privilege grants
do $$ begin
  if exists (select from pg_roles where rolname = 'anon') then
    execute 'revoke truncate on all tables in schema public from anon, authenticated';
    execute 'revoke insert, update, delete on all tables in schema public from anon';
    execute 'alter default privileges in schema public revoke truncate on tables from anon, authenticated';
    execute 'alter default privileges in schema public revoke insert, update, delete on tables from anon';
  end if;
end $$;
