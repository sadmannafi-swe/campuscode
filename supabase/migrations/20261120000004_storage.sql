-- =====================================================================
-- CampusCode — Storage buckets & policies
--   avatars        public read; each user writes only inside "<uid>/"
--   course-assets  public read; admins write
-- =====================================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars', 'avatars', true, 2097152, array['image/png', 'image/jpeg', 'image/webp']),
  ('course-assets', 'course-assets', true, 5242880, array['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'])
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

create policy "avatars: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'avatars');
create policy "avatars: owner insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner update" on storage.objects
  for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "avatars: owner delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);

create policy "course-assets: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'course-assets');
create policy "course-assets: admin write" on storage.objects
  for all to authenticated
  using (bucket_id = 'course-assets' and (select public.is_admin()))
  with check (bucket_id = 'course-assets' and (select public.is_admin()));
