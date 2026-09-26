import { Pressable, StyleSheet, Text, View } from "react-native";
import * as WebBrowser from "expo-web-browser";
import { PRIVACY_URL, TERMS_URL } from "@/config/links";
import { useDialog } from "./dialog";
import { useToast } from "./toast";
import { color, HIT_SIZE, spacing, text } from "@/theme/tokens";

/** 利用規約・プライバシーポリシーの入口。サインイン画面と設定画面の両方に置く（受け入れ基準16） */
export function useOpenLegal() {
  const dialog = useDialog();
  const toast = useToast();
  return async (kind: "terms" | "privacy") => {
    const url = kind === "terms" ? TERMS_URL : PRIVACY_URL;
    const name = kind === "terms" ? "利用規約" : "プライバシーポリシー";
    if (!url) {
      await dialog.confirm({ title: `${name}は準備中です`, confirmLabel: "閉じる", cancelLabel: null });
      return;
    }
    try {
      await WebBrowser.openBrowserAsync(url);
    } catch (e) {
      console.warn("[legal] ページを開けなかった", url, e);
      toast.error(`${name}を開けませんでした`);
    }
  };
}

export function LegalLinks() {
  const open = useOpenLegal();
  return (
    <View style={styles.row}>
      <Pressable accessibilityRole="link" onPress={() => open("terms")} style={styles.link}>
        <Text style={styles.label}>利用規約</Text>
      </Pressable>
      <Text style={styles.dot}>·</Text>
      <Pressable accessibilityRole="link" onPress={() => open("privacy")} style={styles.link}>
        <Text style={styles.label}>プライバシーポリシー</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: spacing.sm },
  link: { minHeight: HIT_SIZE, justifyContent: "center" },
  label: { fontSize: text.label, color: color.brand, fontWeight: "700" },
  dot: { color: color.muted },
});
