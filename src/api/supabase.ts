import "react-native-url-polyfill/auto";
import { AppState } from "react-native";
import { createClient } from "@supabase/supabase-js";
import { LargeSecureStore } from "./secureStorage";

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

/**
 * 環境変数が無いときに true。
 * ⚠️ ここで throw しない。読み込み時に投げると起動直後に落ち、画面に何も出ない（traps.md「起動直後に落ちるとき」）。
 *    代わりにルートで設定エラーの画面を出す
 */
export const supabaseConfigMissing = !supabaseUrl || !supabaseAnonKey;

if (supabaseConfigMissing) {
  console.warn("[supabase] EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY が未設定");
}

export const supabase = createClient(
  supabaseUrl ?? "http://supabase-not-configured.invalid",
  supabaseAnonKey ?? "missing-anon-key",
  {
    auth: {
      storage: LargeSecureStore,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // React Native では必ず false
    },
  }
);

/** バックグラウンドでのトークン更新を止める。起動時に1回だけ呼ぶ */
export function startSessionAutoRefresh(): () => void {
  const subscription = AppState.addEventListener("change", (state) => {
    if (state === "active") supabase.auth.startAutoRefresh();
    else supabase.auth.stopAutoRefresh();
  });
  if (AppState.currentState === "active") supabase.auth.startAutoRefresh();
  return () => {
    subscription.remove();
    supabase.auth.stopAutoRefresh();
  };
}
