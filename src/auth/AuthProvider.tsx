import { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import * as AppleAuthentication from "expo-apple-authentication";
import { startSessionAutoRefresh, supabase } from "@/api/supabase";
import { queryClient } from "@/api/queries";
import { deleteAccount as deleteAccountRpc } from "@/api/works";
import { toAppError } from "@/api/errors";

type AuthState = {
  session: Session | null;
  /** 端末に保存したセッションの復元が終わるまで true。この間は画面を出さない */
  isRestoring: boolean;
  /** キャンセルされたら false。失敗は AppError を投げる */
  signInWithApple: () => Promise<boolean>;
  /**
   * ⚠️ 開発中（__DEV__）だけ使う。Expo Go では Apple でサインインできないため（traps.md）。
   *    本番のサインインは Apple だけ（requirements.md 非スコープ「Apple 以外のログイン」）
   */
  signInWithPasswordForDev: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** 失敗したら AppError を投げ、サインイン状態のまま残る */
  deleteAccount: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isRestoring, setIsRestoring] = useState(true);

  useEffect(() => {
    let mounted = true;
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) console.warn("[auth] セッションを復元できなかった", error);
        if (mounted) setSession(data.session);
      })
      .catch((e) => console.warn("[auth] セッションを復元できなかった", e))
      .finally(() => {
        if (mounted) setIsRestoring(false);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((event, next) => {
      setSession(next);
      // 別のアカウントのデータが残らないようにキャッシュを捨てる
      if (event === "SIGNED_OUT") queryClient.clear();
    });
    const stopAutoRefresh = startSessionAutoRefresh();

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
      stopAutoRefresh();
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      isRestoring,

      async signInWithApple() {
        let credential: AppleAuthentication.AppleAuthenticationCredential;
        try {
          credential = await AppleAuthentication.signInAsync({
            requestedScopes: [AppleAuthentication.AppleAuthenticationScope.EMAIL],
          });
        } catch (e) {
          // 本人がキャンセルしたときはエラーを出さない
          if ((e as { code?: string })?.code === "ERR_REQUEST_CANCELED") return false;
          throw toAppError(e, "Apple でサインインできませんでした");
        }
        if (!credential.identityToken) {
          throw toAppError(new Error("identityToken が無い"), "Apple でサインインできませんでした");
        }
        // ⚠️ Supabase 側で Apple provider を有効にしないと、ここで失敗する（README の初回セットアップ）
        const { error } = await supabase.auth
          .signInWithIdToken({ provider: "apple", token: credential.identityToken })
          .catch((e: unknown) => ({ error: e }));
        if (error) throw toAppError(error, "Apple でサインインできませんでした");
        return true;
      },

      async signInWithPasswordForDev(email, password) {
        if (!__DEV__) throw new Error("開発用のログインは本番では使えない");
        const { error } = await supabase.auth
          .signInWithPassword({ email: email.trim(), password })
          .catch((e: unknown) => ({ error: e }));
        if (error) {
          const message = String((error as { message?: unknown }).message ?? "");
          if (message.includes("Invalid login credentials")) {
            throw toAppError(error, "メールアドレスかパスワードが違います");
          }
          throw toAppError(error, "ログインできませんでした");
        }
      },

      async signOut() {
        const { error } = await supabase.auth.signOut();
        if (error) console.warn("[auth] サインアウトでエラー（端末のセッションは消える）", error);
        queryClient.clear();
      },

      async deleteAccount() {
        await deleteAccountRpc();
        // サーバ側でユーザーはもう消えている。端末のセッションだけ捨てる
        await supabase.auth.signOut({ scope: "local" }).catch((e: unknown) =>
          console.warn("[auth] 削除後のサインアウトでエラー", e)
        );
        queryClient.clear();
      },
    }),
    [session, isRestoring]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth は AuthProvider の内側で呼ぶこと");
  return ctx;
}
