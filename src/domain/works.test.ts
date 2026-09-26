// ⚠️ TypeScript 6 は @types を自動で読まない。アプリ全体に Node の型を混ぜないよう、テストファイルだけで読む
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  buildListRows,
  canDeleteSeason,
  episodeNumbers,
  findDuplicate,
  isFiltered,
  parseEpisodeCount,
  typeChangeEffect,
  validateSeasonName,
  validateTitle,
} from "./works.ts";
import type { Season, Work } from "./types.ts";

function season(id: string, workId: string, position: number, status: Season["status"]): Season {
  return { id, workId, name: `シーズン${position}`, position, episodeCount: 12, status, watchedOn: null };
}

const aot: Work = {
  id: "w1",
  title: "進撃の巨人",
  type: "anime",
  status: null,
  watchedOn: null,
  createdAt: "2026-09-26T03:00:00Z",
  seasons: [season("s1", "w1", 1, "watched"), season("s2", "w1", 2, "watching")],
};
const suzume: Work = {
  id: "w2",
  title: "すずめの戸締まり",
  type: "movie",
  status: "watched",
  watchedOn: "2026-08-01",
  createdAt: "2026-09-26T02:00:00Z",
  seasons: [],
};
const silent: Work = {
  id: "w3",
  title: "silent",
  type: "drama",
  status: null,
  watchedOn: null,
  createdAt: "2026-09-26T01:00:00Z",
  seasons: [season("s3", "w3", 1, "want")],
};
const works = [aot, suzume, silent];
const all = { type: "all", status: "all" } as const;

test("タイトルが空白だけならエラー（基準5）", () => {
  assert.equal(validateTitle("   "), "タイトルを入力してください");
  assert.equal(validateTitle(" 進撃 "), null);
});

test("シーズン名が空ならエラー（基準26）", () => {
  assert.equal(validateSeasonName(""), "シーズン名を入力してください");
  assert.equal(validateSeasonName("シーズン2"), null);
});

test("話数: 空欄は0、整数以外はエラー", () => {
  assert.equal(parseEpisodeCount(""), 0);
  assert.equal(parseEpisodeCount(" 12 "), 12);
  assert.equal(parseEpisodeCount("-1"), null);
  assert.equal(parseEpisodeCount("1.5"), null);
  assert.equal(parseEpisodeCount("十二"), null);
});

test("話数から第1話〜第N話が並ぶ（基準24・34）", () => {
  assert.deepEqual(episodeNumbers(3), [1, 2, 3]);
  assert.deepEqual(episodeNumbers(0), []);
});

test("同じタイトル・同じ種別だけを重複とする（基準18）", () => {
  assert.equal(findDuplicate(works, " すずめの戸締まり ", "movie")?.id, "w2");
  assert.equal(findDuplicate(works, "すずめの戸締まり", "anime"), undefined);
  // 編集中の作品自身は重複に数えない
  assert.equal(findDuplicate(works, "すずめの戸締まり", "movie", "w2"), undefined);
});

test("最後の1シーズンは消せない（基準33）", () => {
  assert.equal(canDeleteSeason(aot), true);
  assert.equal(canDeleteSeason(silent), false);
  assert.equal(canDeleteSeason(suzume), false);
});

test("種別の変更で起きること（基準31・32）", () => {
  assert.equal(typeChangeEffect("anime", "anime"), "none");
  assert.equal(typeChangeEffect("anime", "drama"), "keep-seasons");
  assert.equal(typeChangeEffect("drama", "movie"), "drop-seasons");
  assert.equal(typeChangeEffect("movie", "anime"), "create-first-season");
});

test("作品ごと: 1作品1行、並びは渡した順（基準28）", () => {
  const rows = buildListRows(works, "work", all);
  assert.deepEqual(rows.map((r) => [r.kind, r.key]), [
    ["series", "w1"],
    ["movie", "w2"],
    ["series", "w3"],
  ]);
  const first = rows[0];
  assert.equal(first.kind === "series" && first.seasonCount, 2);
});

test("シーズンごと: シーズンが別の行になり、映画は1行のまま（基準28）", () => {
  const rows = buildListRows(works, "season", all);
  assert.deepEqual(rows.map((r) => r.key), ["s1", "s2", "w2", "s3"]);
});

test("種別と視聴状態の両方で絞り込む（基準10）", () => {
  const filter = { type: "anime", status: "watched" } as const;
  // 作品ごと: 「観た」のシーズンを1つ以上持つアニメ
  assert.deepEqual(buildListRows(works, "work", filter).map((r) => r.key), ["w1"]);
  // シーズンごと: 「観た」のアニメのシーズンだけ
  assert.deepEqual(buildListRows(works, "season", filter).map((r) => r.key), ["s1"]);
});

test("一致が0件なら空で、絞り込み中と分かる（基準10）", () => {
  const filter = { type: "drama", status: "watched" } as const;
  assert.deepEqual(buildListRows(works, "work", filter), []);
  assert.equal(isFiltered(filter), true);
  assert.equal(isFiltered(all), false);
});
