-- 聖地巡礼・グッズ・イベントの写真付き記録
-- 正は docs/contracts.md。⚠️ 本番への適用は人間が行う（docs/collaboration.md §6）
-- 20260926020000_series_rating_and_episode_titles.sql の後に適用する

-- ---------------------------------------------------------------------------
-- 記録と写真メタデータ
-- ---------------------------------------------------------------------------
create table public.records (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  work_id uuid not null references public.works (id) on delete cascade,
  kind text not null check (kind in ('pilgrimage', 'goods', 'event')),
  name text not null check (length(btrim(name)) > 0),
  occurred_on date,
  memo text,
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint records_location_pair check ((latitude is null) = (longitude is null)),
  constraint records_latitude_range check (latitude is null or latitude between -90 and 90),
  constraint records_longitude_range check (longitude is null or longitude between -180 and 180),
  constraint records_goods_without_location check (kind <> 'goods' or (latitude is null and longitude is null))
);

create index records_work_created_idx on public.records (work_id, created_at desc);
create index records_user_created_idx on public.records (user_id, created_at desc);

create table public.record_photos (
  id uuid primary key,
  record_id uuid not null references public.records (id) on delete cascade,
  storage_path text not null unique check (length(btrim(storage_path)) > 0),
  position int not null check (position between 1 and 4),
  created_at timestamptz not null default now(),
  unique (record_id, position)
);

create index record_photos_record_idx on public.record_photos (record_id, position);

create trigger records_set_updated_at before update on public.records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- 親作品と所有者、変更不可項目、写真パス／上限
-- ---------------------------------------------------------------------------
create function public.records_guard() returns trigger
language plpgsql set search_path = public as $$
begin
  if not exists (
    select 1 from public.works w where w.id = new.work_id and w.user_id = new.user_id
  ) then
    raise exception 'record owner must match work owner' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and (
    new.user_id is distinct from old.user_id
    or new.work_id is distinct from old.work_id
    or new.kind is distinct from old.kind
  ) then
    raise exception 'record owner, work and kind cannot be changed' using errcode = 'check_violation';
  end if;
  new.name := btrim(new.name);
  new.memo := nullif(btrim(coalesce(new.memo, '')), '');
  return new;
end;
$$;

create trigger records_guard before insert or update on public.records
  for each row execute function public.records_guard();

create function public.record_photos_guard() returns trigger
language plpgsql set search_path = public as $$
declare
  v_user_id uuid;
begin
  select r.user_id into v_user_id from public.records r where r.id = new.record_id;
  if v_user_id is null then
    raise exception 'record not found' using errcode = 'foreign_key_violation';
  end if;
  if new.storage_path <> v_user_id::text || '/' || new.record_id::text || '/' || new.id::text || '.jpg' then
    raise exception 'invalid record photo path' using errcode = 'check_violation';
  end if;
  if (select count(*) from public.record_photos p where p.record_id = new.record_id and p.id <> new.id) >= 4 then
    raise exception 'a record can have at most four photos' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger record_photos_guard before insert or update on public.record_photos
  for each row execute function public.record_photos_guard();

-- ---------------------------------------------------------------------------
-- 行レベルセキュリティ
-- ---------------------------------------------------------------------------
alter table public.records enable row level security;
alter table public.record_photos enable row level security;

create policy records_own on public.records
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.works w where w.id = work_id and w.user_id = auth.uid())
  );

create policy record_photos_own on public.record_photos
  for all to authenticated
  using (exists (select 1 from public.records r where r.id = record_id and r.user_id = auth.uid()))
  with check (exists (select 1 from public.records r where r.id = record_id and r.user_id = auth.uid()));

-- ---------------------------------------------------------------------------
-- 写真アップロード完了後に記録とメタデータを同じトランザクションで確定する
-- ---------------------------------------------------------------------------
create function public.create_record(
  p_id uuid,
  p_work_id uuid,
  p_kind text,
  p_name text,
  p_occurred_on date,
  p_memo text,
  p_latitude double precision,
  p_longitude double precision,
  p_photo_ids uuid[],
  p_photo_paths text[]
) returns uuid
language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(cardinality(p_photo_ids), 0) <> coalesce(cardinality(p_photo_paths), 0)
     or coalesce(cardinality(p_photo_ids), 0) > 4 then
    raise exception 'invalid photo list' using errcode = 'check_violation';
  end if;

  insert into public.records (id, work_id, kind, name, occurred_on, memo, latitude, longitude)
  values (p_id, p_work_id, p_kind, btrim(p_name), p_occurred_on,
          nullif(btrim(coalesce(p_memo, '')), ''), p_latitude, p_longitude);

  insert into public.record_photos (id, record_id, storage_path, position)
  select photo_id, p_id, photo_path, position::int
  from unnest(coalesce(p_photo_ids, array[]::uuid[]), coalesce(p_photo_paths, array[]::text[]))
       with ordinality as photo(photo_id, photo_path, position);

  return p_id;
end;
$$;

create function public.update_record(
  p_record_id uuid,
  p_name text,
  p_occurred_on date,
  p_memo text,
  p_latitude double precision,
  p_longitude double precision,
  p_photo_ids uuid[],
  p_photo_paths text[]
) returns void
language plpgsql security invoker set search_path = public as $$
begin
  if coalesce(cardinality(p_photo_ids), 0) <> coalesce(cardinality(p_photo_paths), 0)
     or coalesce(cardinality(p_photo_ids), 0) > 4 then
    raise exception 'invalid photo list' using errcode = 'check_violation';
  end if;

  update public.records
  set name = btrim(p_name), occurred_on = p_occurred_on,
      memo = nullif(btrim(coalesce(p_memo, '')), ''),
      latitude = p_latitude, longitude = p_longitude
  where id = p_record_id;
  if not found then
    raise exception 'record not found' using errcode = 'no_data_found';
  end if;

  delete from public.record_photos where record_id = p_record_id;
  insert into public.record_photos (id, record_id, storage_path, position)
  select photo_id, p_record_id, photo_path, position::int
  from unnest(coalesce(p_photo_ids, array[]::uuid[]), coalesce(p_photo_paths, array[]::text[]))
       with ordinality as photo(photo_id, photo_path, position);
end;
$$;

revoke all on function public.create_record(uuid, uuid, text, text, date, text, double precision, double precision, uuid[], text[]) from public, anon;
grant execute on function public.create_record(uuid, uuid, text, text, date, text, double precision, double precision, uuid[], text[]) to authenticated;
revoke all on function public.update_record(uuid, text, date, text, double precision, double precision, uuid[], text[]) from public, anon;
grant execute on function public.update_record(uuid, text, date, text, double precision, double precision, uuid[], text[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 非公開Storageバケット。オブジェクト名の先頭は本人のuser_id
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('record-photos', 'record-photos', false, 10485760, array['image/jpeg'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

create policy record_photos_storage_select on storage.objects
  for select to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy record_photos_storage_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy record_photos_storage_update on storage.objects
  for update to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);

create policy record_photos_storage_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'record-photos' and (storage.foldername(name))[1] = auth.uid()::text);
