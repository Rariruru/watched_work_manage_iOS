-- 作品とシーズン（基盤＋作品の登録）
-- 正は docs/contracts.md。列挙値の綴りはここで決めたものを contracts.md に書き戻してもらう（docs/handoff 参照）
-- ⚠️ 本番への適用は人間が行う（docs/collaboration.md §6）

-- ---------------------------------------------------------------------------
-- 作品
-- ---------------------------------------------------------------------------
create table public.works (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null check (length(btrim(title)) > 0),
  -- anime / drama / movie
  type text not null check (type in ('anime', 'drama', 'movie')),
  -- ⚠️ 視聴状態・視聴日は映画のときだけ作品に持つ。アニメ・ドラマはシーズンに持つ（contracts.md「視聴状態・視聴日」）
  status text check (status in ('want', 'watching', 'watched')),
  watched_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint works_movie_only_status check (
    (type = 'movie' and status is not null)
    or (type <> 'movie' and status is null and watched_on is null)
  )
);

create index works_user_created_idx on public.works (user_id, created_at desc);

-- ---------------------------------------------------------------------------
-- シーズン（アニメ・ドラマのみ）
-- ---------------------------------------------------------------------------
create table public.seasons (
  id uuid primary key default gen_random_uuid(),
  work_id uuid not null references public.works (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null check (length(btrim(name)) > 0),
  -- 作品内の並び順（作成順）。1 始まり
  position int not null check (position >= 1),
  episode_count int not null default 0 check (episode_count >= 0),
  status text not null default 'watched' check (status in ('want', 'watching', 'watched')),
  watched_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (work_id, position)
);

create index seasons_work_idx on public.seasons (work_id, position);

-- ---------------------------------------------------------------------------
-- updated_at
-- ---------------------------------------------------------------------------
create function public.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger works_set_updated_at before update on public.works
  for each row execute function public.set_updated_at();
create trigger seasons_set_updated_at before update on public.seasons
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- シーズンは映画に付けない / アニメ・ドラマの最後の1シーズンは消さない
-- ---------------------------------------------------------------------------
create function public.seasons_guard_insert() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.works w where w.id = new.work_id and w.type = 'movie') then
    raise exception 'movie works cannot have seasons' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger seasons_guard_insert before insert on public.seasons
  for each row execute function public.seasons_guard_insert();

-- ⚠️ 作品ごと削除したとき（on delete cascade）は作品がもう無いので通る。
--    種別を映画に変えるとき（change_work_type）は先に type を変えるので通る。
create function public.seasons_guard_last_delete() returns trigger
language plpgsql as $$
begin
  if exists (select 1 from public.works w where w.id = old.work_id and w.type <> 'movie')
     and not exists (select 1 from public.seasons s where s.work_id = old.work_id and s.id <> old.id) then
    raise exception 'cannot delete the last season' using errcode = 'check_violation';
  end if;
  return old;
end;
$$;

create trigger seasons_guard_last_delete before delete on public.seasons
  for each row execute function public.seasons_guard_last_delete();

-- ---------------------------------------------------------------------------
-- 行レベルセキュリティ：本人の行だけ（受け入れ基準14）
-- ⚠️ 本人判定はここだけで行う。アプリ側で重ねて判定しない（CLAUDE.md「Single Source of Truth」）
-- ---------------------------------------------------------------------------
alter table public.works enable row level security;
alter table public.seasons enable row level security;

create policy works_own on public.works
  for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy seasons_own on public.seasons
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.works w where w.id = work_id and w.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 作品の追加：アニメ・ドラマは「シーズン1」を同じトランザクションで作る（基準23）
-- security invoker なので RLS がそのまま効く
-- ---------------------------------------------------------------------------
create function public.create_work(
  p_title text,
  p_type text,
  p_status text,
  p_episode_count int default 0
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_work_id uuid;
begin
  if p_type = 'movie' then
    insert into public.works (title, type, status)
    values (btrim(p_title), p_type, p_status)
    returning id into v_work_id;
  else
    insert into public.works (title, type)
    values (btrim(p_title), p_type)
    returning id into v_work_id;

    insert into public.seasons (work_id, name, position, episode_count, status)
    values (v_work_id, 'シーズン1', 1, greatest(coalesce(p_episode_count, 0), 0), p_status);
  end if;
  return v_work_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- シーズンの追加：position は作品内の最大 + 1（基準26）
-- ---------------------------------------------------------------------------
create function public.add_season(
  p_work_id uuid,
  p_name text,
  p_episode_count int default 0
) returns uuid
language plpgsql security invoker set search_path = public as $$
declare
  v_id uuid;
begin
  insert into public.seasons (work_id, name, position, episode_count)
  select p_work_id, btrim(p_name),
         coalesce(max(s.position), 0) + 1,
         greatest(coalesce(p_episode_count, 0), 0)
  from public.seasons s
  where s.work_id = p_work_id
  returning id into v_id;
  return v_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- 種別の変更（contracts.md「種別の変更」・基準31・32）
--   アニメ ⇄ ドラマ     : シーズンはそのまま
--   アニメ・ドラマ → 映画: シーズンをすべて消し、映画の視聴状態は「観た」・視聴日なしで始める
--   映画 → アニメ・ドラマ: 「シーズン1」（話数0）を作り、映画の視聴状態・視聴日を移す
-- ⚠️ 評価・感想の列はまだ無い（評価の刻みが未決のため）。追加したら、ここで一緒に移す・消すこと
-- ---------------------------------------------------------------------------
create function public.change_work_type(p_work_id uuid, p_type text)
returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_old public.works%rowtype;
begin
  select * into v_old from public.works where id = p_work_id for update;
  if not found then
    raise exception 'work not found' using errcode = 'no_data_found';
  end if;
  if v_old.type = p_type then
    return;
  end if;

  if p_type = 'movie' then
    update public.works set type = 'movie', status = 'watched', watched_on = null
    where id = p_work_id;
    delete from public.seasons where work_id = p_work_id;
  elsif v_old.type = 'movie' then
    update public.works set type = p_type, status = null, watched_on = null
    where id = p_work_id;
    insert into public.seasons (work_id, name, position, episode_count, status, watched_on)
    values (p_work_id, 'シーズン1', 1, 0, coalesce(v_old.status, 'watched'), v_old.watched_on);
  else
    update public.works set type = p_type where id = p_work_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- アカウント削除（基準3）
-- auth.users を消すと works / seasons は on delete cascade で消える
-- ⚠️ security definer。本人（auth.uid()）以外は消せない。写真のストレージを足したら、ここで一緒に消すこと
-- ---------------------------------------------------------------------------
create function public.delete_account()
returns void
language plpgsql security definer set search_path = public, auth as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = 'insufficient_privilege';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_account() from public, anon;
grant execute on function public.delete_account() to authenticated;
revoke all on function public.create_work(text, text, text, int) from public, anon;
grant execute on function public.create_work(text, text, text, int) to authenticated;
revoke all on function public.add_season(uuid, text, int) from public, anon;
grant execute on function public.add_season(uuid, text, int) to authenticated;
revoke all on function public.change_work_type(uuid, text) from public, anon;
grant execute on function public.change_work_type(uuid, text) to authenticated;
