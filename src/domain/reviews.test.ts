// ⚠️ TypeScript 6 は @types を自動で読まない。アプリ全体に Node の型を混ぜないよう、テストファイルだけで読む
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  commentPreview,
  episodesLostOnShrink,
  formatAverage,
  seasonRating,
  seriesRating,
  isEmptyEpisodeReview,
  normalizeReviewText,
  todayString,
  toRating,
  validateWatchedOn,
} from "./reviews.ts";
import { episodeHeading } from "./labels.ts";
import type { Season, Work } from "./types.ts";

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
    { number: 3, rating: 5, comment: "南西へ向かう場面の緊張感がよかった", title: "南西へ" },
    { number: 10, rating: 4, comment: null, title: null },
    { number: 12, rating: null, comment: "最終話", title: null },
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

test("評価・一言感想・タイトルのどれも無ければ、その話の記録を消す", () => {
  assert.equal(isEmptyEpisodeReview(null, null, null), true);
  assert.equal(isEmptyEpisodeReview(null, "  ", " "), true);
  assert.equal(isEmptyEpisodeReview(5, null, null), false);
  assert.equal(isEmptyEpisodeReview(null, "よかった", null), false);
  // タイトルだけでも残す
  assert.equal(isEmptyEpisodeReview(null, null, "南西へ"), false);
});

test("話の見出し: タイトルがあれば「第3話 南西へ」", () => {
  assert.equal(episodeHeading(3, "南西へ"), "第3話 南西へ");
  assert.equal(episodeHeading(3, null), "第3話");
  assert.equal(episodeHeading(3, "  "), "第3話");
});

function series(rating: Work["rating"], seasonRatings: (Season["rating"])[]): Work {
  return {
    id: "w1",
    title: "進撃の巨人",
    type: "anime",
    coverPath: null,
    coverUrl: null,
    status: null,
    watchedOn: null,
    rating,
    review: null,
    createdAt: "2026-09-26T00:00:00Z",
    seasons: seasonRatings.map((r, i) => ({ ...season, id: `s${i}`, position: i + 1, rating: r, episodes: [] })),
  };
}

test("シーズン評価: 手動が無ければ評価済み各話の平均（基準42）", () => {
  assert.deepEqual(seasonRating({ ...season, rating: null }), { kind: "average", value: 4.5 });
  assert.deepEqual(seasonRating({ ...season, rating: null, episodes: [] }), { kind: "none" });
});

test("シーズン評価: 手動評価を各話平均より優先する（基準42）", () => {
  assert.deepEqual(seasonRating({ ...season, rating: 3 }), { kind: "manual", rating: 3 });
});

test("作品全体の評価: 手動が無ければ評価の付いたシーズンの平均（小数第1位）", () => {
  assert.deepEqual(seriesRating(series(null, [5, 4])), { kind: "average", value: 4.5 });
  // 未評価のシーズンは数えない
  assert.deepEqual(seriesRating(series(null, [5, null, 4])), { kind: "average", value: 4.5 });
  // 1シーズンならその評価
  assert.deepEqual(seriesRating(series(null, [4])), { kind: "average", value: 4 });
  // 5,4,4 → 4.333… → 4.3
  assert.deepEqual(seriesRating(series(null, [5, 4, 4])), { kind: "average", value: 4.3 });
  // 全部未評価
  assert.deepEqual(seriesRating(series(null, [null, null])), { kind: "none" });
});

test("作品全体の評価: 手動の評価があればそれを使う", () => {
  assert.deepEqual(seriesRating(series(2, [5, 5])), { kind: "manual", rating: 2 });
});

test("作品全体の評価: シーズンの各話平均もシーズン単位で数える（基準35・42）", () => {
  const work = series(null, [4, null]);
  work.seasons[1].episodes = [
    { number: 1, rating: 5, comment: null, title: null },
    { number: 2, rating: 4, comment: null, title: null },
  ];
  assert.deepEqual(seriesRating(work), { kind: "average", value: 4.3 });
});

test("平均は常に小数第1位まで出す", () => {
  assert.equal(formatAverage(4), "4.0");
  assert.equal(formatAverage(4.5), "4.5");
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
