import type { RecordKind } from "./types";
import { normalizeWatchedOn, validateWatchedOn } from "./reviews.ts";

export const MAX_RECORD_PHOTOS = 4;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
export const MAX_PHOTO_EDGE = 2048;

export function normalizeRecordText(value: string): string | null {
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

export function validateRecordName(value: string): string | null {
  return value.trim() === "" ? "名前を入力してください" : null;
}

export function validateOccurredOn(value: string): string | null {
  return validateWatchedOn(value);
}

export function normalizeOccurredOn(value: string): string | null {
  return normalizeWatchedOn(value);
}

export function validateLocation(
  kind: RecordKind,
  latitude: number | null,
  longitude: number | null
): string | null {
  if (kind === "goods") return latitude === null && longitude === null ? null : "グッズには位置を保存できません";
  if ((latitude === null) !== (longitude === null)) return "緯度と経度は両方を入力してください";
  if (latitude !== null && (latitude < -90 || latitude > 90)) return "緯度は -90〜90 で入力してください";
  if (longitude !== null && (longitude < -180 || longitude > 180)) return "経度は -180〜180 で入力してください";
  return null;
}

export function canAddPhoto(currentCount: number, bytes: number | null): string | null {
  if (currentCount >= MAX_RECORD_PHOTOS) return `写真は${MAX_RECORD_PHOTOS}枚までです`;
  if (bytes !== null && bytes > MAX_PHOTO_BYTES) return "写真は1枚10MB以下を選んでください";
  return null;
}
