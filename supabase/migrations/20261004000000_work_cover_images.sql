-- 作品画像（受け入れ基準41）
-- 正は docs/contracts.md。⚠️ 本番への適用は人間が行う（docs/collaboration.md §6）
-- 20260927000000_records_and_photos.sql の後に適用する

alter table public.works
  add column cover_path text,
  add constraint works_cover_path check (
    cover_path is null
    or cover_path = user_id::text || '/' || id::text || '/cover.jpg'
  );

-- 非公開Storageバケット。オブジェクト名の先頭は本人のuser_id
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('work-covers', 'work-covers', false, 10485760, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy work_covers_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'work-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy work_covers_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'work-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy work_covers_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'work-covers' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'work-covers' and (storage.foldername(name))[1] = auth.uid()::text);

create policy work_covers_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'work-covers' and (storage.foldername(name))[1] = auth.uid()::text);
