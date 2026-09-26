import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/auth/AuthProvider";
import { toAppError } from "@/api/errors";
import { Banner, Button, Field, Input } from "@/components/common/ui";
import { color, radius, spacing, text } from "@/theme/tokens";

/**
 * ⚠️ 開発中（__DEV__）だけ出す、メールとパスワードのログイン。
 *    Expo Go では Apple でサインインできないので、画面を確かめるために使う（traps.md）。
 *    呼び出し側で __DEV__ のときだけ描くこと。本番のサインインは Apple だけ
 *    アカウントは Supabase の Authentication > Users > Add user で作る（README）
 */
export function DevEmailLogin() {
  const { signInWithPasswordForDev } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithPasswordForDev(email, password);
      // 成功するとセッションが変わり、ルートが作品一覧へ切り替える
    } catch (e) {
      setError(toAppError(e, "ログインできませんでした").message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.box}>
      <Text style={styles.title}>開発用ログイン（本番のアプリには出ません）</Text>
      {error && <Banner tone="error">{error}</Banner>}
      <Field label="メールアドレス">
        <Input
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          textContentType="username"
        />
      </Field>
      <Field label="パスワード">
        <Input value={password} onChangeText={setPassword} secureTextEntry textContentType="password" />
      </Field>
      <Button
        label="ログイン"
        variant="secondary"
        onPress={onSubmit}
        loading={submitting}
        disabled={email.trim() === "" || password === ""}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: color.muted,
  },
  title: { fontSize: text.caption, fontWeight: "700", color: color.muted },
});
