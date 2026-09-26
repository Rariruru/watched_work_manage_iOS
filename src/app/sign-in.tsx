import { useEffect, useState } from "react";
import { Platform, StyleSheet, Text, View } from "react-native";
import * as AppleAuthentication from "expo-apple-authentication";
import Constants from "expo-constants";
import { useAuth } from "@/auth/AuthProvider";
import { LegalLinks } from "@/components/common/LegalLinks";
import { Banner, Screen } from "@/components/common/ui";
import { toAppError } from "@/api/errors";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

/** A サインイン（受け入れ基準1・16）。サインインの手段は Apple だけ */
export default function SignIn() {
  const { signInWithApple } = useAuth();
  const [available, setAvailable] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch((e) => {
        console.warn("[sign-in] Apple サインインが使えるか判定できなかった", e);
        setAvailable(false);
      });
  }, []);

  async function onApple() {
    setError(null);
    try {
      await signInWithApple();
      // 成功するとセッションが変わり、ルートの Stack.Protected が作品一覧へ切り替える
    } catch (e) {
      setError(toAppError(e, "Apple でサインインできませんでした").message);
    }
  }

  return (
    <Screen>
      <View style={styles.body}>
        <View style={styles.icon} />
        {/* アプリ名は app.json の name が正（仮の名前。requirements.md 未決事項） */}
        <Text style={styles.title}>{Constants.expoConfig?.name ?? ""}</Text>
        <Text style={styles.lead}>観た作品の感想と、聖地・グッズ・イベントの記録を残す</Text>

        {error && <Banner tone="error">{error}</Banner>}

        {available ? (
          <AppleAuthentication.AppleAuthenticationButton
            buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
            buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
            cornerRadius={radius.md}
            style={styles.apple}
            onPress={onApple}
          />
        ) : available === false ? (
          <Banner tone="info">
            {Platform.OS === "web"
              ? "Apple でのサインインは iPhone のアプリでだけ使えます"
              : "この端末では Apple でサインインできません"}
          </Banner>
        ) : null}

        <LegalLinks />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { flex: 1, justifyContent: "center", padding: spacing.xl, gap: spacing.lg },
  icon: { width: 72, height: 72, borderRadius: radius.lg, backgroundColor: color.brandSoft, alignSelf: "center" },
  title: { fontSize: text.heading, fontWeight: "700", color: color.ink, textAlign: "center" },
  lead: { fontSize: text.label, color: color.muted, textAlign: "center", lineHeight: 20 },
  apple: { height: HIT_SIZE + 4, width: "100%" },
});
