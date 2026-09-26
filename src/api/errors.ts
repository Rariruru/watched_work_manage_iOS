/**
 * 失敗の分類。画面は message をそのまま出してよい。
 * ⚠️ 「取得できなかった」と「0件だった」を混ぜないため、取得の失敗は必ずこの型で投げる（traps.md「エラーを握り潰さない」）
 */
export type AppErrorKind = "offline" | "server" | "invalid-response";

export class AppError extends Error {
  readonly kind: AppErrorKind;
  readonly cause?: unknown;

  constructor(kind: AppErrorKind, message: string, cause?: unknown) {
    super(message);
    this.name = "AppError";
    this.kind = kind;
    this.cause = cause;
  }
}

export const OFFLINE_MESSAGE = "接続できません。通信状態を確かめて、もう一度お試しください";

function looksLikeNetworkError(e: unknown): boolean {
  const text = String((e as { message?: unknown })?.message ?? e ?? "").toLowerCase();
  return (
    text.includes("network request failed") ||
    text.includes("failed to fetch") ||
    text.includes("fetch failed") ||
    text.includes("networkerror") ||
    text.includes("load failed")
  );
}

export const SCHEMA_OUTDATED_MESSAGE =
  "データベースの更新が適用されていません。supabase/migrations の SQL を順に適用してください（README）";

/**
 * ⚠️ アプリが新しい列・表を読むのに、Supabase に SQL を適用し忘れたときの失敗。
 *    一覧の取得ごと失敗して原因が見えなくなる（traps.md「順序を守る」）ので、文言を分ける
 *    42703 = 列が無い / 42P01 = 表が無い / 42883 = 関数が無い / PGRST200・PGRST202 = PostgREST が関係・関数を見つけられない
 */
function looksLikeSchemaOutdated(e: unknown): boolean {
  const code = String((e as { code?: unknown })?.code ?? "");
  return ["42703", "42P01", "42883", "PGRST200", "PGRST202"].includes(code);
}

/** Supabase・fetch の失敗を AppError に揃える。fallback はサーバ側の失敗のときに出す文言 */
export function toAppError(e: unknown, fallback: string): AppError {
  if (e instanceof AppError) return e;
  if (looksLikeNetworkError(e)) return new AppError("offline", OFFLINE_MESSAGE, e);
  if (looksLikeSchemaOutdated(e)) {
    console.warn("[api] スキーマが古い", e);
    return new AppError("server", SCHEMA_OUTDATED_MESSAGE, e);
  }
  // 原因に辿り着けるよう、元のエラーは必ずログに残す
  console.warn("[api]", fallback, e);
  return new AppError("server", fallback, e);
}
