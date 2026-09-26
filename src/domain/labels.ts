import type { WatchStatus, WorkType } from "./types";

/** 画面に出す日本語の名前。同じ文言をほかのファイルに書かないこと */
export const WORK_TYPE_LABEL: Record<WorkType, string> = {
  anime: "アニメ",
  drama: "ドラマ",
  movie: "映画",
};

export const WATCH_STATUS_LABEL: Record<WatchStatus, string> = {
  want: "観たい",
  watching: "観ている",
  watched: "観た",
};

export function episodeLabel(n: number): string {
  return `第${n}話`;
}

export const UNRATED_LABEL = "未評価";

/** ★の並び。未評価は「未評価」 */
export function ratingLabel(rating: number | null): string {
  if (rating === null) return UNRATED_LABEL;
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}
