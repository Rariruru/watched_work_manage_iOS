-- アニメ・ドラマの作品全体の評価（手動）と、各話のタイトル
-- ⚠️ 本番への適用は人間が行う（docs/collaboration.md §6）。20260926010000_reviews_and_episodes.sql の後に適用する
--
-- 決定の変更（2026-09-26 上田）:
--   前は「作品全体の評価は持たない・平均は出さない」だった（requirements.md 非スコープ）。
--   アニメ・ドラマの作品全体の評価は「評価の付いたシーズンの平均」を既定にし、手動でも付けられるようにする。
--   平均は保存しない（表示のたびにアプリが計算する）。手動の評価だけを works.rating に保存する

-- ---------------------------------------------------------------------------
-- works.rating の意味
--   映画        : 映画の評価
--   アニメ・ドラマ: 作品全体の手動の評価。null なら平均を使う
-- 視聴状態・視聴日・感想は、アニメ・ドラマでは今までどおりシーズンに持つ
-- ---------------------------------------------------------------------------
alter table public.works drop constraint works_movie_only_status;
alter table public.works add constraint works_movie_only_status check (
  (type = 'movie' and status is not null)
  or (type <> 'movie' and status is null and watched_on is null and review is null)
);

-- change_work_type はそのままでよい:
--   アニメ・ドラマ → 映画: rating を null にする（手動の評価は消え、映画は未評価で始まる）
--   映画 → アニメ・ドラマ: rating を null にし、映画の評価はシーズン1に移る（作品全体は平均＝シーズン1の評価）
--   アニメ ⇄ ドラマ     : rating はそのまま残る

-- ---------------------------------------------------------------------------
-- 各話のタイトル（任意）。タイトルだけの話も記録に残す
-- ---------------------------------------------------------------------------
alter table public.episodes add column title text;

alter table public.episodes drop constraint episodes_not_empty;
alter table public.episodes add constraint episodes_not_empty check (
  rating is not null
  or length(btrim(coalesce(comment, ''))) > 0
  or length(btrim(coalesce(title, ''))) > 0
);

-- set_episode_review に p_title を足す（引数が変わるので作り直す）
drop function public.set_episode_review(uuid, int, smallint, text);

create function public.set_episode_review(
  p_season_id uuid,
  p_number int,
  p_rating smallint,
  p_comment text,
  p_title text
) returns void
language plpgsql security invoker set search_path = public as $$
declare
  v_comment text := nullif(btrim(coalesce(p_comment, '')), '');
  v_title text := nullif(btrim(coalesce(p_title, '')), '');
begin
  if p_rating is null and v_comment is null and v_title is null then
    delete from public.episodes where season_id = p_season_id and number = p_number;
    return;
  end if;
  insert into public.episodes (season_id, number, rating, comment, title)
  values (p_season_id, p_number, p_rating, v_comment, v_title)
  on conflict (season_id, number)
  do update set rating = excluded.rating, comment = excluded.comment, title = excluded.title;
end;
$$;

revoke all on function public.set_episode_review(uuid, int, smallint, text, text) from public, anon;
grant execute on function public.set_episode_review(uuid, int, smallint, text, text) to authenticated;
