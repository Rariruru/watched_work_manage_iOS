-- 感想・評価（映画・シーズン・各話）
-- 正は docs/contracts.md「評価」「話」「種別の変更」。評価は 1〜5 の整数か null（未評価）。0 を未評価に使わない
-- ⚠️ 本番への適用は人間が行う（docs/collaboration.md §6）。20260926000000_works_and_seasons.sql の後に適用する

-- ---------------------------------------------------------------------------
-- 映画（作品）とシーズンの評価・感想
-- ---------------------------------------------------------------------------
alter table public.works
  add column rating smallint check (rating between 1 and 5),
  add column review text;

-- ⚠️ 評価・感想も映画のときだけ作品に持つ。アニメ・ドラマはシーズンに持つ
alter table public.works drop constraint works_movie_only_status;
alter table public.works add constraint works_movie_only_status check (
  (type = 'movie' and status is not null)
  or (type <> 'movie' and status is null and watched_on is null and rating is null and review is null)
);

alter table public.seasons
  add column rating smallint check (rating between 1 and 5),
  add column review text;

-- ---------------------------------------------------------------------------
-- 各話の評価・一言感想。評価か一言感想のどちらかがある話だけ行を持つ（無い話は「未評価」）
-- ---------------------------------------------------------------------------
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  season_id uuid not null references public.seasons (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  number int not null check (number >= 1),
  rating smallint check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (season_id, number),
  constraint episodes_not_empty check (rating is not null or length(btrim(coalesce(comment, ''))) > 0)
);

create trigger episodes_set_updated_at before update on public.episodes
  for each row execute function public.set_updated_at();

-- 話の番号はシーズンの話数の範囲内だけ
create function public.episodes_guard_number() returns trigger
language plpgsql as $$
begin
  if new.number > coalesce((select s.episode_count from public.seasons s where s.id = new.season_id), 0) then
    raise exception 'episode number % is out of range', new.number using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

create trigger episodes_guard_number before insert or update on public.episodes
  for each row execute function public.episodes_guard_number();

-- 話数を減らしたら、範囲外になった話の評価・一言感想を消す（基準27。確認はアプリが先に出す）
create function public.seasons_trim_episodes() returns trigger
language plpgsql as $$
begin
  delete from public.episodes where season_id = new.id and number > new.episode_count;
  return new;
end;
$$;

create trigger seasons_trim_episodes after update of episode_count on public.seasons
  for each row when (new.episode_count < old.episode_count)
  execute function public.seasons_trim_episodes();

alter table public.episodes enable row level security;

create policy episodes_own on public.episodes
  for all to authenticated
  using (user_id = auth.uid())
  with check (
    user_id = auth.uid()
    and exists (select 1 from public.seasons s where s.id = season_id and s.user_id = auth.uid())
  );

-- ---------------------------------------------------------------------------
-- 話の評価を保存する。評価も一言感想も空なら、その話の行を消す（「未評価」に戻る）
-- security invoker なので RLS がそのまま効く
-- ---------------------------------------------------------------------------
create function public.set_episode_review(
  p_season_id uuid,
  p_number int,
  p_rating smallint,
  p_comment text
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if p_rating is null and v_comment is null then
    delete from public.episodes where season_id = p_season_id and number = p_number;
    return;
  end if;
  insert into public.episodes (season_id, number, rating, comment)
  values (p_season_id, p_number, p_rating, v_comment)
  on conflict (season_id, number)
  do update set rating = excluded.rating, comment = excluded.comment;
end;
$$;

revoke all on function public.set_episode_review(uuid, int, smallint, text) from public, anon;
grant execute on function public.set_episode_review(uuid, int, smallint, text) to authenticated;

-- ---------------------------------------------------------------------------
-- 種別の変更に評価・感想を加える（置き換え。contracts.md「種別の変更」・基準31・32）
--   アニメ・ドラマ → 映画: シーズン・各話の評価と感想を消す。映画は「観た」・未評価・感想なしで始める
--                          （「観た」で始めるのは 2026-09-26 上田の決定。contracts.md の「空で始まる」は3値を空にできないため）
--   映画 → アニメ・ドラマ: 「シーズン1」（話数0）を作り、映画の視聴状態・視聴日・評価・感想を移す
-- ---------------------------------------------------------------------------
create or replace function public.change_work_type(p_work_id uuid, p_type text)
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
    update public.works
    set type = 'movie', status = 'watched', watched_on = null, rating = null, review = null
    where id = p_work_id;
    -- 各話の評価は seasons の on delete cascade で消える
    delete from public.seasons where work_id = p_work_id;
  elsif v_old.type = 'movie' then
    update public.works
    set type = p_type, status = null, watched_on = null, rating = null, review = null
    where id = p_work_id;
    insert into public.seasons (work_id, name, position, episode_count, status, watched_on, rating, review)
    values (p_work_id, 'シーズン1', 1, 0, coalesce(v_old.status, 'watched'), v_old.watched_on, v_old.rating, v_old.review);
  else
    update public.works set type = p_type where id = p_work_id;
  end if;
end;
$$;
