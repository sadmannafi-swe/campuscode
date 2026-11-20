-- =====================================================================
-- Certificates: render lease. Several requests can find a certificate
-- without a PDF at the same moment (DB-triggered render, the student's
-- profile sync, a download). Only the caller that claims the lease
-- renders; the others wait briefly for the stored PDF instead.
-- =====================================================================
alter table public.certificates add column pdf_render_started_at timestamptz;

create or replace function public.claim_certificate_render(p_certificate uuid)
returns boolean language plpgsql volatile security definer set search_path = public
as $$
begin
  update public.certificates
     set pdf_render_started_at = now()
   where id = p_certificate and pdf_path is null and status = 'valid'
     and (pdf_render_started_at is null or pdf_render_started_at < now() - interval '90 seconds');
  return found;
end $$;

create or replace function public.release_certificate_render(p_certificate uuid)
returns void language sql volatile security definer set search_path = public
as $$ update public.certificates set pdf_render_started_at = null where id = p_certificate and pdf_path is null $$;

revoke all on function public.claim_certificate_render(uuid)   from public, anon, authenticated;
revoke all on function public.release_certificate_render(uuid) from public, anon, authenticated;
grant execute on function public.claim_certificate_render(uuid)   to service_role;
grant execute on function public.release_certificate_render(uuid) to service_role;
