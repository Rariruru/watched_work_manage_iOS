/**
 * 作品・シーズンの型。正は docs/contracts.md。
 * ⚠️ 列挙値の綴りは supabase/migrations の check 制約と同じ。片方だけ変えないこと
 */

export const WORK_TYPES = ["anime", "drama", "movie"] as const;
export type WorkType = (typeof WORK_TYPES)[number];

export const WATCH_STATUSES = ["want", "watching", "watched"] as const;
export type WatchStatus = (typeof WATCH_STATUSES)[number];

/** 新しく作るときの既定の視聴状態（contracts.md「列挙値」） */
export const DEFAULT_WATCH_STATUS: WatchStatus = "watched";

/** 評価。1〜5 の整数、null は「未評価」。⚠️ 0 を未評価の意味に使わない（contracts.md「評価」） */
export const RATINGS = [1, 2, 3, 4, 5] as const;
export type Rating = (typeof RATINGS)[number];

/** 各話の評価・一言感想。どちらかがある話だけが存在する（無い話は未評価） */
export type EpisodeReview = {
  number: number;
  rating: Rating | null;
  comment: string | null;
};

export type Season = {
  id: string;
  workId: string;
  name: string;
  /** 作品内の並び順。1 始まり */
  position: number;
  /** 0 のときは話が並ばない */
  episodeCount: number;
  status: WatchStatus;
  watchedOn: string | null;
  rating: Rating | null;
  review: string | null;
  /** 評価か一言感想のある話だけ。番号の昇順 */
  episodes: EpisodeReview[];
};

export type Work = {
  id: string;
  title: string;
  type: WorkType;
  /** 映画のときだけ値がある。アニメ・ドラマはシーズンに持つ */
  status: WatchStatus | null;
  watchedOn: string | null;
  /** 映画のときだけ値がある。アニメ・ドラマはシーズンに持つ */
  rating: Rating | null;
  review: string | null;
  createdAt: string;
  /** 作品内の並び順（position の昇順）。映画は常に空 */
  seasons: Season[];
};
