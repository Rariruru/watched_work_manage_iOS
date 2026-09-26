import type { EpisodeReview, Rating, Season } from "./types";

/**
 * 感想・評価の判断をまとめた純関数。
 * ⚠️ このファイルは実行時の import をしない（node --test で型を剥がして直接動かすため）
 * ⚠️ 日付は文字列を Date に変換しない。実機のエンジンだけ日付の文字列の解釈に失敗した前例がある（traps.md）。算術だけで扱う
 */

export function isRating(n: unknown): n is Rating {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

/** DB から来た値を評価に揃える。範囲外は「未評価」に倒し、警告を出す */
export function toRating(n: unknown): Rating | null {
  if (n === null || n === undefined) return null;
  if (isRating(n)) return n;
  console.warn("[reviews] 1〜5 以外の評価を未評価として扱った", n);
  return null;
}

/** 感想・一言感想の入力。前後の空白を除き、空なら null */
export function normalizeReviewText(text: string): string | null {
  const t = text.trim();
  return t === "" ? null : t;
}

function isLeapYear(y: number): boolean {
  return (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
}

function daysInMonth(y: number, m: number): number {
  if (m === 2) return isLeapYear(y) ? 29 : 28;
  return [4, 6, 9, 11].includes(m) ? 30 : 31;
}

/** 視聴日の入力。空は「日付なし」で OK。YYYY-MM-DD で実在する日付でなければエラー文言 */
export function validateWatchedOn(text: string): string | null {
  const t = text.trim();
  if (t === "") return null;
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t);
  if (!m) return "日付は 2026-09-26 の形で入力してください";
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  if (mo < 1 || mo > 12 || d < 1 || d > daysInMonth(y, mo)) return "存在しない日付です";
  return null;
}

/** 空なら null、そうでなければ前後の空白を除いた YYYY-MM-DD（validateWatchedOn を通した後に使う） */
export function normalizeWatchedOn(text: string): string | null {
  const t = text.trim();
  return t === "" ? null : t;
}

/** 端末の今日の日付（YYYY-MM-DD）。文字列を解釈せず、年月日の数値から組み立てる */
export function todayString(now: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** 評価・一言感想のどちらも無ければ、その話は「未評価」（記録を消す） */
export function isEmptyEpisodeReview(rating: Rating | null, comment: string | null): boolean {
  return rating === null && (comment === null || comment.trim() === "");
}

export function findEpisodeReview(season: Season, number: number): EpisodeReview | undefined {
  return season.episodes.find((e) => e.number === number);
}

/**
 * 話数を newCount に減らしたときに消える、評価・一言感想のある話の番号（基準27）。
 * 空なら確認は要らない
 */
export function episodesLostOnShrink(season: Season, newCount: number): number[] {
  return season.episodes
    .filter((e) => e.number > newCount)
    .map((e) => e.number)
    .sort((a, b) => a - b);
}

/** 一覧や話の行に出す、一言感想の冒頭 */
export function commentPreview(comment: string | null, max = 24): string {
  if (!comment) return "";
  const oneLine = comment.replace(/\s+/g, " ").trim();
  return oneLine.length > max ? `${oneLine.slice(0, max)}…` : oneLine;
}
