import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import type { WatchStatus } from "@/domain/types";
import { parseEpisodeCount, validateSeasonName } from "@/domain/works";
import { Field, Header, Input, Screen, Segmented } from "@/components/common/ui";
import { WATCH_STATUS_OPTIONS } from "./options";
import { spacing } from "@/theme/tokens";

export type SeasonFormValues = { name: string; episodeCount: number; status: WatchStatus };

/**
 * シーズンの追加・編集の共通フォーム（S-edit）。
 * 検証に通ったときだけ onSubmit を呼ぶ。保存に失敗しても入力は残る
 */
export function SeasonForm(props: {
  title: string;
  initial: { name: string; episodeCount: number; status: WatchStatus };
  /** 追加のときは視聴状態を出さない（既定の「観た」で作る） */
  showStatus: boolean;
  saving: boolean;
  onCancel: () => void;
  onSubmit: (values: SeasonFormValues) => void;
  footer?: React.ReactNode;
}) {
  const [name, setName] = useState(props.initial.name);
  const [episodes, setEpisodes] = useState(
    props.initial.episodeCount > 0 ? String(props.initial.episodeCount) : ""
  );
  const [status, setStatus] = useState<WatchStatus>(props.initial.status);
  const [nameError, setNameError] = useState<string | null>(null);
  const [episodesError, setEpisodesError] = useState<string | null>(null);

  function submit() {
    const nErr = validateSeasonName(name);
    const count = parseEpisodeCount(episodes);
    const eErr = count === null ? "0 以上の整数で入力してください" : null;
    setNameError(nErr);
    setEpisodesError(eErr);
    if (nErr || eErr || count === null) return;
    props.onSubmit({ name: name.trim(), episodeCount: count, status });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Header
          title={props.title}
          left={{ label: "キャンセル", onPress: props.onCancel }}
          right={{ label: "保存", onPress: submit, disabled: props.saving }}
        />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="シーズン名（必須）" error={nameError}>
            <Input value={name} onChangeText={setName} invalid={!!nameError} />
          </Field>
          <Field label="話数" error={episodesError}>
            <Input
              value={episodes}
              onChangeText={setEpisodes}
              keyboardType="number-pad"
              placeholder="例: 12（あとで入力してもよい）"
              invalid={!!episodesError}
            />
          </Field>
          {props.showStatus && (
            <Field label="視聴状態">
              <Segmented options={WATCH_STATUS_OPTIONS} value={status} onChange={setStatus} />
            </Field>
          )}
          {props.footer}
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg },
});
