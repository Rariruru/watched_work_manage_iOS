import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

/**
 * 確認ダイアログ。
 * ⚠️ Alert.alert は react-native-web では空関数で、Web の確認中に「削除ボタンが効かない」形で出る
 *    （前作 Collecie で踏んだ）。Alert.alert は使わず、このダイアログを使う
 */

type ConfirmRequest = {
  title: string;
  message?: string;
  confirmLabel: string;
  /** null でキャンセルボタンを出さない（知らせるだけのとき） */
  cancelLabel?: string | null;
  destructive?: boolean;
};

type DialogApi = {
  /** 確定したら true。キャンセル・背景タップは false */
  confirm: (request: ConfirmRequest) => Promise<boolean>;
};

const DialogContext = createContext<DialogApi | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  // 解決関数は再レンダリングをまたいで持つ。state に入れると閉じる前に消える
  const resolveRef = useRef<((value: boolean) => void) | null>(null);

  const close = useCallback((value: boolean) => {
    setRequest(null);
    const resolve = resolveRef.current;
    resolveRef.current = null;
    resolve?.(value);
  }, []);

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (next) =>
        new Promise<boolean>((resolve) => {
          // 開いたままなら前の待ち手をキャンセル扱いで解放する（宙吊りを防ぐ）
          resolveRef.current?.(false);
          resolveRef.current = resolve;
          setRequest(next);
        }),
    }),
    []
  );

  return (
    <DialogContext.Provider value={api}>
      {children}
      <Modal visible={request !== null} transparent animationType="fade" onRequestClose={() => close(false)}>
        <Pressable style={styles.backdrop} onPress={() => close(false)}>
          <Pressable style={styles.sheet} onPress={() => {}}>
            <Text style={styles.title}>{request?.title}</Text>
            {request?.message ? <Text style={styles.message}>{request.message}</Text> : null}
            <View style={styles.actions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => close(true)}
                style={[styles.button, request?.destructive ? styles.danger : styles.primary]}
              >
                <Text style={[styles.label, request?.destructive ? styles.dangerLabel : styles.primaryLabel]}>
                  {request?.confirmLabel}
                </Text>
              </Pressable>
              {request?.cancelLabel !== null && (
                <Pressable accessibilityRole="button" onPress={() => close(false)} style={[styles.button, styles.ghost]}>
                  <Text style={[styles.label, styles.ghostLabel]}>{request?.cancelLabel ?? "やめる"}</Text>
                </Pressable>
              )}
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </DialogContext.Provider>
  );
}

export function useDialog(): DialogApi {
  const ctx = useContext(DialogContext);
  if (!ctx) throw new Error("useDialog は DialogProvider の内側で呼ぶこと");
  return ctx;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: color.backdrop,
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.xl,
  },
  sheet: { width: "100%", maxWidth: 380, backgroundColor: color.surface, borderRadius: radius.lg, padding: spacing.xl },
  title: { fontSize: text.title, fontWeight: "700", color: color.ink, textAlign: "center" },
  message: { fontSize: text.label, lineHeight: 20, color: color.muted, textAlign: "center", marginTop: spacing.md },
  actions: { marginTop: spacing.xl, gap: spacing.sm },
  button: { minHeight: HIT_SIZE, borderRadius: radius.md, alignItems: "center", justifyContent: "center" },
  primary: { backgroundColor: color.brand },
  danger: { backgroundColor: color.surface, borderWidth: 1.5, borderColor: color.danger },
  ghost: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  label: { fontSize: text.body, fontWeight: "700" },
  primaryLabel: { color: color.onBrand },
  dangerLabel: { color: color.danger },
  ghostLabel: { color: color.muted },
});
