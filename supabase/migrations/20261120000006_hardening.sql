-- =====================================================================
-- Hardening from the Supabase security advisor.
-- * Pin search_path on helper functions.
-- * assert_admin() is an internal helper called by SECURITY DEFINER RPCs (which run as the
--   owner); it does not need to be callable through the REST API.
-- Intentionally unchanged: admin_* RPCs stay executable by `authenticated` because each one
-- calls assert_admin() first; is_admin()/is_active_user()/setting_enabled() stay executable
-- because RLS policies evaluate them as the caller's role.
-- =====================================================================
alter function public.set_updated_at()    set search_path = public;
alter function public.is_trusted_caller() set search_path = public;
alter function public.activity_today()    set search_path = public;

revoke execute on function public.assert_admin() from public, anon, authenticated;
