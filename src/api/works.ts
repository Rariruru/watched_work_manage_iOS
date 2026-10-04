import { manipulateAsync, SaveFormat } from "expo-image-manipulator";
import { supabase } from "./supabase";
import { AppError, toAppError } from "./errors";
import type { EpisodeReview, Rating, Season, WatchStatus, Work, WorkType } from "@/domain/types";
import { toRating } from "@/domain/reviews";
import { MAX_PHOTO_EDGE } from "@/domain/records";

/**
 * 作品・シーズンの読み書き。画面はここを通して Supabase を触る（.from() を画面に書かない）。
 * 本人の行だけに絞るのは RLS の仕事。ここで user_id を付けて絞らない
 */

type EpisodeRow = { number: number; rating: number | null; comment: string | null; title: string | null };
type WorkRecordPhotoRow = { record_photos: { storage_path: string }[] | null };
type WorkCoverRow = { cover_path: string | null };

const COVER_BUCKET = "work-covers";

export type WorkCoverDraft = {
  previewUri: string;
  localUri: string | null;
  storagePath: string | null;
  width: number;
  height: number;
  fileSize: number | null;
};

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
  cover_path: string | null;
  created_at: string;
  seasons: SeasonRow[] | null;
};

// ⚠️ rating / review / episodes は 20260926010000_reviews_and_episodes.sql、episodes.title は 20260926020000_… で足した列・表。
//    適用前だと一覧の取得ごと失敗する。そのときは errors.ts が「データベースの更新が適用されていません」を出す
const WORK_SELECT =
  "id, title, type, status, watched_on, rating, review, cover_path, created_at, " +
  "seasons(id, work_id, name, position, episode_count, status, watched_on, rating, review, episodes(number, rating, comment, title))";

function toEpisode(row: EpisodeRow): EpisodeReview {
  return { number: row.number, rating: toRating(row.rating), comment: row.comment, title: row.title };
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

async function signedCoverUrl(path: string | null): Promise<string | null> {
  if (!path) return null;
  const { data, error } = await supabase.storage.from(COVER_BUCKET).createSignedUrl(path, 60 * 60);
  if (error || !data?.signedUrl) {
    console.warn("[works] 作品画像のURLを作れなかった", path, error);
    return null;
  }
  return data.signedUrl;
}

async function toWork(row: WorkRow): Promise<Work> {
  if (!Array.isArray(row.seasons)) {
    // ⚠️ 期待しない形。0件に倒すとシーズンが消えたように見えるので、残して警告だけ出す
    console.warn("[works] seasons が配列ではない", row.id, row.seasons);
  }
  return {
    id: row.id,
    title: row.title,
    type: row.type,
    coverPath: row.cover_path,
    coverUrl: await signedCoverUrl(row.cover_path),
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
  return Promise.all((data as unknown as WorkRow[]).map(toWork));
}

export async function createWork(input: {
  title: string;
  type: WorkType;
  status: WatchStatus;
  episodeCount: number;
  cover: WorkCoverDraft | null;
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
  if (input.cover) {
    try {
      await syncWorkCover(id, null, input.cover);
    } catch (error) {
      await deleteWork(id).catch((rollbackError) =>
        console.warn("[works] 作品画像の失敗後に作品を戻せなかった", id, rollbackError)
      );
      throw error;
    }
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
  // DBの連鎖削除ではStorage実体は消えないため、削除前にパスだけ控える。
  const [workRow, photoRows] = await Promise.all([
    run("作品画像を確認できませんでした", () =>
      supabase.from("works").select("cover_path").eq("id", id).maybeSingle()
    ),
    run("作品の写真を確認できませんでした", () =>
      supabase.from("records").select("record_photos(storage_path)").eq("work_id", id)
    ),
  ]);
  const coverPath = (workRow as unknown as WorkCoverRow | null)?.cover_path ?? null;
  const photoPaths = ((photoRows ?? []) as unknown as WorkRecordPhotoRow[]).flatMap((record) =>
    (record.record_photos ?? []).map((photo) => photo.storage_path)
  );
  await run("作品を削除できませんでした", () => supabase.from("works").delete().eq("id", id));
  if (photoPaths.length > 0) {
    const { error } = await supabase.storage.from("record-photos").remove(photoPaths);
    // DB削除は完了済み。成功通知を誤って失敗へ戻さず、運用で追えるよう警告を残す。
    if (error) console.warn("[works] 削除済み作品の写真をStorageから削除できなかった", photoPaths, error);
  }
  if (coverPath) {
    const { error } = await supabase.storage.from(COVER_BUCKET).remove([coverPath]);
    if (error) console.warn("[works] 削除済み作品の画像をStorageから削除できなかった", coverPath, error);
  }
}

async function currentUserId(): Promise<string> {
  let response: Awaited<ReturnType<typeof supabase.auth.getUser>>;
  try {
    response = await supabase.auth.getUser();
  } catch (error) {
    throw toAppError(error, "サインイン情報を確認できませんでした");
  }
  if (response.error) throw toAppError(response.error, "サインイン情報を確認できませんでした");
  const id = response.data.user?.id;
  if (typeof id !== "string") throw new AppError("invalid-response", "サインイン情報を確認できませんでした");
  return id;
}

function coverResizeAction(cover: WorkCoverDraft) {
  const longest = Math.max(cover.width, cover.height);
  if (longest <= MAX_PHOTO_EDGE) return [];
  return cover.width >= cover.height
    ? [{ resize: { width: MAX_PHOTO_EDGE } }]
    : [{ resize: { height: MAX_PHOTO_EDGE } }];
}

async function uploadCover(workId: string, cover: WorkCoverDraft): Promise<string> {
  if (!cover.localUri) {
    if (cover.storagePath) return cover.storagePath;
    throw new AppError("invalid-response", "作品画像を読み込めませんでした");
  }
  const userId = await currentUserId();
  const rendered = await manipulateAsync(cover.localUri, coverResizeAction(cover), {
    compress: 0.85,
    format: SaveFormat.JPEG,
    base64: false,
  });
  const bytes = await fetch(rendered.uri).then((response) => response.arrayBuffer());
  const path = `${userId}/${workId}/cover.jpg`;
  const { error } = await supabase.storage.from(COVER_BUCKET).upload(path, bytes, {
    contentType: "image/jpeg",
    cacheControl: "0",
    upsert: true,
  });
  if (error) throw toAppError(error, "作品画像をアップロードできませんでした");
  return path;
}

export async function syncWorkCover(
  workId: string,
  previousPath: string | null,
  cover: WorkCoverDraft | null
): Promise<void> {
  if (cover?.localUri) {
    const path = await uploadCover(workId, cover);
    if (previousPath === path) return;
    try {
      await run("作品画像を保存できませんでした", () =>
        supabase.from("works").update({ cover_path: path }).eq("id", workId)
      );
    } catch (error) {
      await supabase.storage.from(COVER_BUCKET).remove([path]);
      throw error;
    }
    return;
  }

  if (cover?.storagePath === previousPath) return;
  if (!previousPath) return;
  await run("作品画像を外せませんでした", () =>
    supabase.from("works").update({ cover_path: null }).eq("id", workId)
  );
  const { error } = await supabase.storage.from(COVER_BUCKET).remove([previousPath]);
  if (error) console.warn("[works] 外した作品画像をStorageから削除できなかった", previousPath, error);
}

export function coverDraftFromWork(work: Work): WorkCoverDraft | null {
  if (!work.coverPath) return null;
  return {
    previewUri: work.coverUrl ?? "",
    localUri: null,
    storagePath: work.coverPath,
    width: 0,
    height: 0,
    fileSize: null,
  };
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

/** 話の評価・一言感想・タイトル（基準25）。全部 null なら DB 側でその話の記録を消す */
export async function setEpisodeReview(
  seasonId: string,
  number: number,
  input: { rating: Rating | null; comment: string | null; title: string | null }
): Promise<void> {
  await run("話の評価を保存できませんでした", () =>
    supabase.rpc("set_episode_review", {
      p_season_id: seasonId,
      p_number: number,
      p_rating: input.rating,
      p_comment: input.comment,
      p_title: input.title,
    })
  );
}

/**
 * アニメ・ドラマの作品全体の手動の評価。null で「平均に戻す」。
 * ⚠️ 映画の評価と同じ works.rating の列。アニメ・ドラマのときは「手動の評価」の意味になる
 */
export async function saveSeriesRating(workId: string, rating: Rating | null): Promise<void> {
  await run("作品全体の評価を保存できませんでした", () =>
    supabase.from("works").update({ rating }).eq("id", workId)
  );
}

/** アカウント削除。Edge Functionが写真を消してからauth.usersを削除し、DBは連鎖削除される */
export async function deleteAccount(): Promise<void> {
  await run("削除できませんでした。記録は残っています", () => supabase.functions.invoke("delete-account"));
}
