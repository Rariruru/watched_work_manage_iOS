import type { Season, WatchStatus, Work, WorkType } from "./types";

/**
 * 作品・シーズンの判断をまとめた純関数。画面からはここだけを呼び、条件分岐を画面に書かない。
 * ⚠️ このファイルは実行時の import をしない（node --test で型を剥がして直接動かすため）
 */

/** アニメ・ドラマはシーズンを持つ。映画は持たない */
export function hasSeasons(type: WorkType): boolean {
  return type !== "movie";
}

export function normalizeTitle(title: string): string {
  return title.trim();
}

/** 空なら入力欄に出すエラー文言、問題なければ null */
export function validateTitle(title: string): string | null {
  return normalizeTitle(title).length === 0 ? "タイトルを入力してください" : null;
}

export function validateSeasonName(name: string): string | null {
  return name.trim().length === 0 ? "シーズン名を入力してください" : null;
}

/**
 * 話数の入力欄。空欄は 0（あとで入力してよい）。
 * 0 以上の整数でなければ null（＝入力エラー）
 */
export function parseEpisodeCount(text: string): number | null {
  const t = text.trim();
  if (t === "") return 0;
  if (!/^\d+$/.test(t)) return null;
  const n = Number.parseInt(t, 10);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * 重複の判定（contracts.md「作品」）: 同じ利用者の中で、タイトルが一致 かつ 種別が一致。
 * ⚠️ 一致の定義は今は「前後の空白を除いて完全一致」。全角半角・大文字小文字の扱いは未定
 */
export function findDuplicate(
  works: readonly Work[],
  title: string,
  type: WorkType,
  excludeId?: string
): Work | undefined {
  const t = normalizeTitle(title);
  return works.find(
    (w) => w.id !== excludeId && w.type === type && normalizeTitle(w.title) === t
  );
}

/** 第1話〜第N話の番号 */
export function episodeNumbers(count: number): number[] {
  return Array.from({ length: Math.max(0, Math.floor(count)) }, (_, i) => i + 1);
}

/** アニメ・ドラマは最後の1シーズンを消せない（contracts.md「シーズン」） */
export function canDeleteSeason(work: Work): boolean {
  return hasSeasons(work.type) && work.seasons.length > 1;
}

/**
 * 種別を変えたときに何が起きるか（contracts.md「種別の変更」）。
 * 実際の移し替えは DB の change_work_type が1トランザクションで行う。ここは確認を出すかどうかの判断だけ
 */
export type TypeChangeEffect = "none" | "keep-seasons" | "drop-seasons" | "create-first-season";

export function typeChangeEffect(from: WorkType, to: WorkType): TypeChangeEffect {
  if (from === to) return "none";
  if (to === "movie") return "drop-seasons";
  if (from === "movie") return "create-first-season";
  return "keep-seasons";
}

// ---------------------------------------------------------------------------
// 作品一覧の行（contracts.md「作品一覧の表示単位」）
// ---------------------------------------------------------------------------

export type ListMode = "work" | "season";

export type ListFilter = {
  type: WorkType | "all";
  status: WatchStatus | "all";
};

export type ListRow =
  | { kind: "series"; key: string; work: Work; seasonCount: number }
  | { kind: "season"; key: string; work: Work; season: Season }
  | { kind: "movie"; key: string; work: Work };

function statusMatches(status: WatchStatus | null, filter: ListFilter["status"]): boolean {
  return filter === "all" || status === filter;
}

/**
 * 作品一覧に並べる行。works は登録の新しい順で渡すこと（並び順はそのまま使う）。
 * - 「作品ごと」: 1作品1行。アニメ・ドラマは「その状態のシーズンを1つ以上持つ」とき一致
 * - 「シーズンごと」: アニメ・ドラマは1シーズン1行。映画は1作品1行のまま
 */
export function buildListRows(
  works: readonly Work[],
  mode: ListMode,
  filter: ListFilter
): ListRow[] {
  const rows: ListRow[] = [];
  for (const work of works) {
    if (filter.type !== "all" && work.type !== filter.type) continue;

    if (!hasSeasons(work.type)) {
      if (statusMatches(work.status, filter.status)) {
        rows.push({ kind: "movie", key: work.id, work });
      }
      continue;
    }

    if (mode === "work") {
      if (work.seasons.some((s) => statusMatches(s.status, filter.status))) {
        rows.push({ kind: "series", key: work.id, work, seasonCount: work.seasons.length });
      }
      continue;
    }

    for (const season of work.seasons) {
      if (statusMatches(season.status, filter.status)) {
        rows.push({ kind: "season", key: season.id, work, season });
      }
    }
  }
  return rows;
}

/** 絞り込みが掛かっているか（0件のときの文言を「まだ作品がありません」と分けるため） */
export function isFiltered(filter: ListFilter): boolean {
  return filter.type !== "all" || filter.status !== "all";
}
