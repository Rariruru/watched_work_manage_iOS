import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { color, radius, spacing, text } from "@/theme/tokens";

/**
 * 保存・削除の成否を知らせる通知（受け入れ基準15）。
 * 保存・削除のたびに success か error のどちらかを必ず出すこと。
 * ⚠️ 確認を取る用途には使わない。それは dialog.tsx の役割
 */

type ToastKind = "success" | "error";
type ToastApi = { success: (message: string) => void; error: (message: string) => void };
type ToastState = { id: number; kind: ToastKind; message: string };

/** 失敗は読ませたいので長め */
const DURATION: Record<ToastKind, number> = { success: 2400, error: 4500 };

const ToastContext = createContext<ToastApi | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const nextId = useRef(0);

  const dismiss = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    setToast(null);
  }, []);

  const api = useMemo<ToastApi>(() => {
    function show(kind: ToastKind, message: string) {
      if (timer.current) clearTimeout(timer.current);
      nextId.current += 1;
      setToast({ id: nextId.current, kind, message });
      timer.current = setTimeout(() => setToast(null), DURATION[kind]);
    }
    return {
      success: (message) => show("success", message),
      error: (message) => show("error", message),
    };
  }, []);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    []
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {toast && <ToastView key={toast.id} toast={toast} onDismiss={dismiss} />}
    </ToastContext.Provider>
  );
}

function ToastView({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  const insets = useSafeAreaInsets();
  return (
    <View style={[styles.wrap, { bottom: insets.bottom + spacing.lg }]} pointerEvents="box-none">
      <Pressable
        onPress={onDismiss}
        accessibilityRole="alert"
        style={[styles.toast, { backgroundColor: toast.kind === "error" ? color.danger : color.brand }]}
      >
        <Text style={styles.message}>{toast.message}</Text>
      </Pressable>
    </View>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast は ToastProvider の内側で呼ぶこと");
  return ctx;
}

const styles = StyleSheet.create({
  wrap: { position: "absolute", left: spacing.lg, right: spacing.lg, alignItems: "center", zIndex: 9999 },
  toast: {
    width: "100%",
    maxWidth: 480,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  message: { color: color.onBrand, fontSize: text.body, fontWeight: "700", textAlign: "center" },
});
