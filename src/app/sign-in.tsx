import { useEffect, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { requireOptionalNativeModule } from "expo";
import { useAuth } from "@/auth/AuthProvider";
import { LegalLinks } from "@/components/common/LegalLinks";
import { Banner, Screen } from "@/components/common/ui";
import { toAppError } from "@/api/errors";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

/**
 * ⚠️ 開発用ログインは __DEV__ のときだけ require する。
 *    普通に import すると、画面に出なくても部品のコードが本番のビルドに入る（2026-09-26 に Web の本番ビルドで確認）
 */
const DevEmailLogin: React.ComponentType | null = __DEV__
  ? // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@/components/sign-in/DevEmailLogin").DevEmailLogin
  : null;

/**
 * Apple でサインインが使えるか。
 * ⚠️ 「使えない」と「判定に失敗した」を分ける。前は両方を「使えません」にしていて、
 *    Expo Go で原因が分からなかった（2026-09-26）
 */
type Availability =
  | { state: "checking" }
  | { state: "available" }
  | { state: "unavailable" }
  /** アプリにネイティブモジュールが入っていない。isAvailableAsync はこのとき黙って false を返す */
  | { state: "module-missing" }
  | { state: "check-failed"; detail: string };

/** ネイティブモジュールの有無は起動中に変わらないので、読み込み時に1回だけ見る */
const APPLE_MODULE_MISSING =
  Platform.OS !== "web" && !requireOptionalNativeModule("ExpoAppleAuthentication");

/** 実行環境（Expo Go / 開発用ビルド / 本番）。開発中の表示だけに使う */
function runtimeLabel(): string {
  return `${Constants.executionEnvironment}${Constants.expoVersion ? ` / Expo Go ${Constants.expoVersion}` : ""}`;
}

/** 開発中だけ、失敗の中身を画面に出す（実機のログを見なくても原因が分かるように） */
function devDetail(e: unknown): string | null {
  if (!__DEV__) return null;
  const err = e as { code?: unknown; message?: unknown };
  return [err?.code, err?.message ?? String(e)].filter(Boolean).join(": ");
}

/** A サインイン（受け入れ基準1・16）。サインインの手段は Apple だけ */
export default function SignIn() {
  const { signInWithApple } = useAuth();
  const [availability, setAvailability] = useState<Availability>(
    APPLE_MODULE_MISSING ? { state: "module-missing" } : { state: "checking" }
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (APPLE_MODULE_MISSING) {
      console.warn("[sign-in] ExpoAppleAuthentication のネイティブモジュールが無い", runtimeLabel());
      return;
    }
    AppleAuthentication.isAvailableAsync()
      .then((ok) => setAvailability({ state: ok ? "available" : "unavailable" }))
      .catch((e) => {
        console.warn("[sign-in] Apple サインインが使えるか判定できなかった", e);
        setAvailability({ state: "check-failed", detail: devDetail(e) ?? "" });
      });
  }, []);

  async function onApple() {
    setError(null);
    try {
      await signInWithApple();
      // 成功するとセッションが変わり、ルートの Stack.Protected が作品一覧へ切り替える
    } catch (e) {
      const appError = toAppError(e, "Apple でサインインできませんでした");
      const detail = devDetail(appError.cause ?? e);
      setError(detail ? `${appError.message}\n（開発中のみ表示）${detail}` : appError.message);
    }
  }

  // iOS では判定に失敗してもボタンは出す。押したときの本当のエラーを画面に出すため
  const showButton =
    availability.state === "available" || (availability.state === "check-failed" && Platform.OS === "ios");

  return (
    <Screen>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
        <View style={styles.icon} />
        {/* アプリ名は app.json の name が正。requirements.md の確定名とそろえる */}
        <Text style={styles.title}>{Constants.expoConfig?.name ?? ""}</Text>
        <Text style={styles.lead}>観た作品の感想と、聖地・グッズ・イベントの記録を残す</Text>

        {error && <Banner tone="error">{error}</Banner>}

        {showButton && (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.apple}
            onPress={onApple}
          />
        )}
        {availability.state === "unavailable" && (
          <Banner tone="info">
            {Platform.OS === "web"
              ? "Apple でのサインインは iPhone のアプリでだけ使えます"
              : "この端末では Apple でサインインできません"}
          </Banner>
        )}
        {availability.state === "module-missing" && (
          <Banner tone="warn">
            {`このアプリには Apple でサインインの機能が入っていません。${
              __DEV__ ? `\n（開発中のみ表示）実行環境: ${runtimeLabel()}` : ""
            }`}
          </Banner>
        )}
        {availability.state === "check-failed" && (
          <Banner tone="warn">
            {`Apple でサインインが使えるか確かめられませんでした。${
              availability.detail ? `\n（開発中のみ表示）${availability.detail}` : ""
            }`}
          </Banner>
        )}

        {/* ⚠️ 開発中だけ。本番のビルドでは __DEV__ が false になり、この部品ごと出ない */}
        {DevEmailLogin && <DevEmailLogin />}

        <LegalLinks />
      </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flexGrow: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: color.brandSoft, alignSelf: "center" },
  title: { fontSize: text.heading, fontWeight: "700", color: color.ink, textAlign: "center" },
  lead: { fontSize: text.label, color: color.muted, textAlign: "center", lineHeight: 20 },
  apple: { height: HIT_SIZE + 4, width: "100%" },
});
