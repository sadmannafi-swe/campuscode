-- =====================================================================
-- Enforce admin platform switches in the database (not only in the UI).
-- =====================================================================
create or replace function public.setting_enabled(p_key text, p_default boolean default true)
returns boolean language sql stable security definer set search_path = public
as $$
  select coalesce((select value = 'true'::jsonb from public.platform_settings where key = p_key), p_default);
$$;
grant execute on function public.setting_enabled(text, boolean) to anon, authenticated, service_role;

drop policy "problems: create own" on public.problems;
create policy "problems: create own" on public.problems
  for insert to authenticated
  with check ((author_id = (select auth.uid())
               and (select public.is_active_user())
               and (select public.setting_enabled('community.problems_enabled')))
              or (select public.is_admin()));
