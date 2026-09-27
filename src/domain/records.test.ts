// ⚠️ TypeScript 6 は @types を自動で読まない。テストファイルだけで Node の型を読む
/// <reference types="node" />
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MAX_PHOTO_BYTES,
  canAddPhoto,
  normalizeOccurredOn,
  normalizeRecordText,
  validateLocation,
  validateOccurredOn,
  validateRecordName,
} from "./records.ts";

test("記録名は必須で、前後の空白を除く（基準20）", () => {
  assert.equal(validateRecordName("   "), "名前を入力してください");
  assert.equal(validateRecordName("  東京駅  "), null);
  assert.equal(normalizeRecordText("  東京駅  "), "東京駅");
  assert.equal(normalizeRecordText("   "), null);
});

test("日付は実在する YYYY-MM-DD または空", () => {
  assert.equal(validateOccurredOn(""), null);
  assert.equal(validateOccurredOn("2026-09-27"), null);
  assert.equal(validateOccurredOn("2026-02-30"), "存在しない日付です");
  assert.equal(normalizeOccurredOn(" 2026-09-27 "), "2026-09-27");
});

test("グッズは位置を持たず、ほかは緯度経度を対で持つ（基準21・29）", () => {
  assert.equal(validateLocation("goods", null, null), null);
  assert.equal(validateLocation("goods", 35, 139), "グッズには位置を保存できません");
  assert.equal(validateLocation("pilgrimage", 35, 139), null);
  assert.equal(validateLocation("event", 35, null), "緯度と経度は両方を入力してください");
  assert.equal(validateLocation("event", 91, 139), "緯度は -90〜90 で入力してください");
});

test("写真は4枚、入力は1枚10MBまで（基準38）", () => {
  assert.equal(canAddPhoto(3, MAX_PHOTO_BYTES), null);
  assert.equal(canAddPhoto(4, 1), "写真は4枚までです");
  assert.equal(canAddPhoto(0, MAX_PHOTO_BYTES + 1), "写真は1枚10MB以下を選んでください");
});
