import { supabase } from "./supabase";
import { AppError, toAppError } from "./errors";
import type { EpisodeReview, Rating, Season, WatchStatus, Work, WorkType } from "@/domain/types";
import { toRating } from "@/domain/reviews";

/**
 * 作品・シーズンの読み書き。画面はここを通して Supabase を触る（.from() を画面に書かない）。
 * 本人の行だけに絞るのは RLS の仕事。ここで user_id を付けて絞らない
 */

type EpisodeRow = { number: number; rating: number | null; comment: string | null };

type SeasonRow = {
  id: string;
  work_id: string;
  name: string;
  position: number;
  episode_count: number;
  status: WatchStatus;
  watched_on: string | null;
  rating: number | null;
  review: string | null;
  episodes: EpisodeRow[] | null;
};

type WorkRow = {
  id: string;
  title: string;
  type: WorkType;
  status: WatchStatus | null;
  watched_on: string | null;
  rating: number | null;
  review: string | null;
  created_at: string;
  seasons: SeasonRow[] | null;
};

// ⚠️ rating / review / episodes は 20260926010000_reviews_and_episodes.sql で足した列・表。
//    適用前だと一覧の取得ごと失敗する。そのときは errors.ts が「データベースの更新が適用されていません」を出す
const WORK_SELECT =
  "id, title, type, status, watched_on, rating, review, created_at, " +
  "seasons(id, work_id, name, position, episode_count, status, watched_on, rating, review, episodes(number, rating, comment))";

function toEpisode(row: EpisodeRow): EpisodeReview {
  return { number: row.number, rating: toRating(row.rating), comment: row.comment };
}

function toSeason(row: SeasonRow): Season {
  return {
    id: row.id,
    workId: row.work_id,
    name: row.name,
    position: row.position,
    episodeCount: row.episode_count,
    status: row.status,
    watchedOn: row.watched_on,
    rating: toRating(row.rating),
    review: row.review,
    episodes: (row.episodes ?? []).map(toEpisode).sort((a, b) => a.number - b.number),
  };
}

function toWork(row: WorkRow): Work {
  if (!Array.isArray(row.seasons)) {
    // ⚠️ 期待しない形。0件に倒すとシーズンが消えたように見えるので、残して警告だけ出す
    console.warn("[works] seasons が配列ではない", row.id, row.seasons);
  }
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    status: row.status,
    watchedOn: row.watched_on,
    rating: toRating(row.rating),
    review: row.review,
    createdAt: row.created_at,
    seasons: (row.seasons ?? []).map(toSeason).sort((a, b) => a.position - b.position),
  };
}

async function run<T>(fallback: string, fn: () => PromiseLike<{ data: T; error: unknown }>): Promise<T> {
  let result: { data: T; error: unknown };
  try {
    result = await fn();
  } catch (e) {
    throw toAppError(e, fallback);
  }
  if (result.error) throw toAppError(result.error, fallback);
  return result.data;
}

/** 作品一覧（登録の新しい順）。取得に失敗したら AppError を投げる。0件は [] */
export async function fetchWorks(): Promise<Work[]> {
  const data = await run("作品を読み込めませんでした", () =>
    supabase.from("works").select(WORK_SELECT).order("created_at", { ascending: false })
  );
  // ⚠️ 応答の形を確かめる。配列でない 2xx を「0件」として扱わない（traps.md「サーバ側の処理を足したときの応答」）
  if (!Array.isArray(data)) {
    console.warn("[works] 一覧の応答が配列ではない", data);
    throw new AppError("invalid-response", "作品を読み込めませんでした");
  }
  return (data as unknown as WorkRow[]).map(toWork);
}

export async function createWork(input: {
  title: string;
  type: WorkType;
  status: WatchStatus;
  episodeCount: number;
}): Promise<string> {
  const id = await run("作品を保存できませんでした", () =>
    supabase.rpc("create_work", {
      p_title: input.title,
      p_type: input.type,
      p_status: input.status,
      p_episode_count: input.episodeCount,
    })
  );
  if (typeof id !== "string") {
    console.warn("[works] create_work が id を返さなかった", id);
    throw new AppError("invalid-response", "作品を保存できませんでした");
  }
  return id;
}

export async function updateWork(
  id: string,
  patch: { title?: string; status?: WatchStatus }
): Promise<void> {
  await run("作品を保存できませんでした", () =>
    supabase.from("works").update(patch).eq("id", id)
  );
}

/** 種別の変更。シーズンの作成・削除は DB 側で1トランザクションに行う */
export async function changeWorkType(id: string, type: WorkType): Promise<void> {
  await run("種別を変更できませんでした", () =>
    supabase.rpc("change_work_type", { p_work_id: id, p_type: type })
  );
}

export async function deleteWork(id: string): Promise<void> {
  await run("作品を削除できませんでした", () => supabase.from("works").delete().eq("id", id));
}

export async function addSeason(input: {
  workId: string;
  name: string;
  episodeCount: number;
}): Promise<void> {
  await run("シーズンを保存できませんでした", () =>
    supabase.rpc("add_season", {
      p_work_id: input.workId,
      p_name: input.name.trim(),
      p_episode_count: input.episodeCount,
    })
  );
}

export async function updateSeason(
  id: string,
  patch: { name: string; episodeCount: number; status: WatchStatus }
): Promise<void> {
  await run("シーズンを保存できませんでした", () =>
    supabase
      .from("seasons")
      .update({ name: patch.name.trim(), episode_count: patch.episodeCount, status: patch.status })
      .eq("id", id)
  );
}

export async function deleteSeason(id: string): Promise<void> {
  await run("シーズンを削除できませんでした", () =>
    supabase.from("seasons").delete().eq("id", id)
  );
}

/** 映画・シーズンの感想（E 感想・評価の編集）。空の欄は null で送る */
export type ReviewInput = {
  status: WatchStatus;
  rating: Rating | null;
  watchedOn: string | null;
  review: string | null;
};

function reviewColumns(input: ReviewInput) {
  return {
    status: input.status,
    rating: input.rating,
    watched_on: input.watchedOn,
    review: input.review,
  };
}

/** 映画の感想・評価（基準6・7） */
export async function saveMovieReview(workId: string, input: ReviewInput): Promise<void> {
  await run("感想を保存できませんでした", () =>
    supabase.from("works").update(reviewColumns(input)).eq("id", workId)
  );
}

/** シーズン全体の感想・評価（基準6・7） */
export async function saveSeasonReview(seasonId: string, input: ReviewInput): Promise<void> {
  await run("感想を保存できませんでした", () =>
    supabase.from("seasons").update(reviewColumns(input)).eq("id", seasonId)
  );
}

/** 話の評価・一言感想（基準25）。両方 null なら DB 側でその話の記録を消す（未評価に戻る） */
export async function setEpisodeReview(
  seasonId: string,
  number: number,
  rating: Rating | null,
  comment: string | null
): Promise<void> {
  await run("話の評価を保存できませんでした", () =>
    supabase.rpc("set_episode_review", {
      p_season_id: seasonId,
      p_number: number,
      p_rating: rating,
      p_comment: comment,
    })
  );
}

/** アカウント削除。作品・シーズン・各話の評価は DB の on delete cascade で消える */
export async function deleteAccount(): Promise<void> {
  await run("削除できませんでした。記録は残っています", () => supabase.rpc("delete_account"));
}
