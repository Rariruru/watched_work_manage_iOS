import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import NetInfo from "@react-native-community/netinfo";
import { useAuth } from "@/auth/AuthProvider";
import { AppError, OFFLINE_MESSAGE, toAppError } from "@/api/errors";
import { useDialog } from "@/components/common/dialog";
import { useOpenLegal } from "@/components/common/LegalLinks";
import { useToast } from "@/components/common/toast";
import { Banner, Header, Screen, SectionTitle } from "@/components/common/ui";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

const DELETE_FAILED = "削除できませんでした。記録は残っています";

/**
 * H 設定・I アカウント削除（受け入れ基準3・16）。
 * ⚠️ 作品一覧の読み込みに失敗していても、ここには入れること（一覧のヘッダーから常に開ける）
 */
export default function Settings() {
  const router = useRouter();
  const dialog = useDialog();
  const toast = useToast();
  const openLegal = useOpenLegal();
  const { session, signOut, deleteAccount } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function onSignOut() {
    const proceed = await dialog.confirm({ title: "サインアウトしますか？", confirmLabel: "サインアウト" });
    if (proceed) await signOut();
  }

  async function onDeleteAccount() {
    const proceed = await dialog.confirm({
      title: "アカウントを削除しますか？",
      message: "作品とシーズンがすべて消え、元に戻せません。",
      confirmLabel: "削除する",
      destructive: true,
    });
    if (!proceed) return;

    setDeleting(true);
    setDeleteError(null);
    try {
      const net = await NetInfo.fetch().catch(() => null);
      if (net?.isConnected === false) throw new AppError("offline", OFFLINE_MESSAGE);
      await deleteAccount();
      // 成功するとセッションが消え、ルートがサインイン画面に切り替える
      toast.success("アカウントを削除しました");
    } catch (e) {
      // 失敗したらこの画面に残る。サインイン画面へは戻さない（基準3）
      const err = toAppError(e, DELETE_FAILED);
      const message = err.kind === "offline" ? `${DELETE_FAILED}（${OFFLINE_MESSAGE}）` : DELETE_FAILED;
      setDeleteError(message);
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <Header title="設定" left={{ label: "‹ 作品", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) }} />
      <ScrollView contentContainerStyle={styles.body}>
        <SectionTitle>アカウント</SectionTitle>
        <Text style={styles.note}>
          Apple ID でサインイン中{session?.user.email ? `（${session.user.email}）` : ""}
        </Text>
        <Item label="利用規約" onPress={() => openLegal("terms")} />
        <Item label="プライバシーポリシー" onPress={() => openLegal("privacy")} />
        <Item label="サインアウト" onPress={onSignOut} />
        <Item label={deleting ? "削除しています…" : "アカウントを削除"} danger onPress={onDeleteAccount} disabled={deleting} />
        {deleteError && <Banner tone="error">{deleteError}</Banner>}
      </ScrollView>
    </Screen>
  );
}

function Item(props: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={props.disabled}
      style={({ pressed }) => [styles.item, (pressed || props.disabled) && { opacity: 0.6 }]}
    >
      <Text style={[styles.itemLabel, props.danger && { color: color.danger }]}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.sm },
  note: { fontSize: text.label, color: color.muted },
  item: {
    minHeight: HIT_SIZE,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  itemLabel: { fontSize: text.body, fontWeight: "700", color: color.ink },
});
