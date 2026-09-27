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

export const RECORD_KINDS = ["pilgrimage", "goods", "event"] as const;
export type RecordKind = (typeof RECORD_KINDS)[number];

export type RecordPhoto = {
  id: string;
  storagePath: string;
  position: number;
  /** 非公開Storageの期限付きURL。取得できなかったときは null */
  url: string | null;
};

export type WorkRecord = {
  id: string;
  workId: string;
  kind: RecordKind;
  name: string;
  occurredOn: string | null;
  memo: string | null;
  latitude: number | null;
  longitude: number | null;
  createdAt: string;
  photos: RecordPhoto[];
};

/** 各話の評価・一言感想・タイトル。どれかがある話だけが存在する（無い話は未評価・タイトルなし） */
export type EpisodeReview = {
  number: number;
  rating: Rating | null;
  comment: string | null;
  title: string | null;
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
  /** 評価・一言感想・タイトルのどれかがある話だけ。番号の昇順 */
  episodes: EpisodeReview[];
};

export type Work = {
  id: string;
  title: string;
  type: WorkType;
  /** 映画のときだけ値がある。アニメ・ドラマはシーズンに持つ */
  status: WatchStatus | null;
  watchedOn: string | null;
  /**
   * 映画: 映画の評価。
   * アニメ・ドラマ: 作品全体の**手動の**評価。null ならシーズンの平均を使う（reviews.ts の seriesRating）
   */
  rating: Rating | null;
  /** 映画のときだけ値がある。アニメ・ドラマの感想はシーズンに持つ */
  review: string | null;
  createdAt: string;
  /** 作品内の並び順（position の昇順）。映画は常に空 */
  seasons: Season[];
};
