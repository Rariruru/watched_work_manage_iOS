import { WATCH_STATUSES, WORK_TYPES } from "@/domain/types";
import type { WatchStatus, WorkType } from "@/domain/types";
import { WATCH_STATUS_LABEL, WORK_TYPE_LABEL } from "@/domain/labels";
import type { ListMode } from "@/domain/works";

/** Segmented / ChipRow に渡す選択肢。並び順は types.ts の定義順 */
export const WORK_TYPE_OPTIONS: { value: WorkType; label: string }[] = WORK_TYPES.map((v) => ({
  value: v,
  label: WORK_TYPE_LABEL[v],
}));

export const WATCH_STATUS_OPTIONS: { value: WatchStatus; label: string }[] = WATCH_STATUSES.map((v) => ({
  value: v,
  label: WATCH_STATUS_LABEL[v],
}));

export const TYPE_FILTER_OPTIONS: { value: WorkType | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  ...WORK_TYPE_OPTIONS,
];

export const STATUS_FILTER_OPTIONS: { value: WatchStatus | "all"; label: string }[] = [
  { value: "all", label: "すべて" },
  ...WATCH_STATUS_OPTIONS,
];

export const LIST_MODE_OPTIONS: { value: ListMode; label: string }[] = [
  { value: "work", label: "作品ごと" },
  { value: "season", label: "シーズンごと" },
];
