// ⚠️ TypeScript 6 は @types を自動で読まない。アプリ全体に Node の型を混ぜないよう、テストファイルだけで読む
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commentPreview,
  episodesLostOnShrink,
  isEmptyEpisodeReview,
  normalizeReviewText,
  todayString,
  toRating,
  validateWatchedOn,
} from "./reviews.ts";
import type { Season } from "./types.ts";

const season: Season = {
  id: "s2",
  workId: "w1",
  name: "シーズン2",
  position: 2,
  episodeCount: 12,
  status: "watched",
  watchedOn: null,
  rating: 4,
  review: null,
  episodes: [
    { number: 3, rating: 5, comment: "南西へ向かう場面の緊張感がよかった" },
    { number: 10, rating: 4, comment: null },
    { number: 12, rating: null, comment: "最終話" },
  ],
};

test("評価は 1〜5 の整数だけ。0 や範囲外は未評価（基準7）", () => {
  assert.equal(toRating(4), 4);
  assert.equal(toRating(null), null);
  assert.equal(toRating(0), null);
  assert.equal(toRating(6), null);
  assert.equal(toRating(3.5), null);
});

test("感想は前後の空白を除き、空なら null", () => {
  assert.equal(normalizeReviewText("  よかった \n"), "よかった");
  assert.equal(normalizeReviewText("   "), null);
});

test("視聴日: 空は OK、形が違う・存在しない日付はエラー", () => {
  assert.equal(validateWatchedOn(""), null);
  assert.equal(validateWatchedOn("2026-09-26"), null);
  assert.equal(validateWatchedOn("2028-02-29"), null); // うるう年
  assert.equal(validateWatchedOn("2026-02-29"), "存在しない日付です");
  assert.equal(validateWatchedOn("2026-13-40"), "存在しない日付です");
  assert.equal(validateWatchedOn("2026/09/26"), "日付は 2026-09-26 の形で入力してください");
  assert.equal(validateWatchedOn("2026-9-6"), "日付は 2026-09-26 の形で入力してください");
});

test("今日の日付は数値から組み立てる", () => {
  assert.equal(todayString(new Date(2026, 8, 6)), "2026-09-06");
});

test("評価も一言感想も無ければ、その話は未評価", () => {
  assert.equal(isEmptyEpisodeReview(null, null), true);
  assert.equal(isEmptyEpisodeReview(null, "  "), true);
  assert.equal(isEmptyEpisodeReview(5, null), false);
  assert.equal(isEmptyEpisodeReview(null, "よかった"), false);
});

test("話数を減らすと消える話の番号（基準27）", () => {
  assert.deepEqual(episodesLostOnShrink(season, 8), [10, 12]);
  assert.deepEqual(episodesLostOnShrink(season, 12), []);
  assert.deepEqual(episodesLostOnShrink(season, 0), [3, 10, 12]);
});

test("一言感想の冒頭", () => {
  assert.equal(commentPreview("南西へ向かう場面の緊張感がよかった", 6), "南西へ向かう…");
  assert.equal(commentPreview(null), "");
});
