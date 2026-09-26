import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { createWork } from "@/api/works";
import { useWorks } from "@/api/queries";
import { useSave } from "@/api/useSave";
import { DEFAULT_WATCH_STATUS } from "@/domain/types";
import type { WatchStatus, WorkType } from "@/domain/types";
import { WORK_TYPE_LABEL } from "@/domain/labels";
import { findDuplicate, hasSeasons, parseEpisodeCount, validateTitle } from "@/domain/works";
import { useDialog } from "@/components/common/dialog";
import { Banner, Field, Header, Input, Screen, Segmented } from "@/components/common/ui";
import { WATCH_STATUS_OPTIONS, WORK_TYPE_OPTIONS } from "@/components/works/options";
import { spacing } from "@/theme/tokens";

/** C 作品の追加（受け入れ基準4・5・18・23） */
export default function NewWork() {
  const router = useRouter();
  const dialog = useDialog();
  const works = useWorks();
  const { run, saving } = useSave();

  const [title, setTitle] = useState("");
  const [type, setType] = useState<WorkType>("anime");
  const [status, setStatus] = useState<WatchStatus>(DEFAULT_WATCH_STATUS);
  const [episodes, setEpisodes] = useState("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [episodesError, setEpisodesError] = useState<string | null>(null);

  async function onSave() {
    const tErr = validateTitle(title);
    const count = parseEpisodeCount(episodes);
    const eErr = hasSeasons(type) && count === null ? "0 以上の整数で入力してください" : null;
    setTitleError(tErr);
    setEpisodesError(eErr);
    if (tErr || eErr) return;

    // 同じタイトル・同じ種別があっても登録は許す。警告して選ばせる（基準18）
    const duplicate = findDuplicate(works.data ?? [], title, type);
    if (duplicate) {
      const proceed = await dialog.confirm({
        title: "既に登録されています",
        message: `「${duplicate.title}」（${WORK_TYPE_LABEL[type]}）は既に作品リストにあります。それでも追加しますか？`,
        confirmLabel: "追加する",
        cancelLabel: "やめる",
      });
      if (!proceed) return;
    }

    let createdId: string | null = null;
    const ok = await run(
      async () => {
        createdId = await createWork({ title, type, status, episodeCount: hasSeasons(type) ? (count ?? 0) : 0 });
      },
      "保存しました",
      "作品を保存できませんでした"
    );
    if (ok && createdId) router.replace({ pathname: "/works/[id]", params: { id: createdId } });
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Header
          title="作品を追加"
          left={{ label: "キャンセル", onPress: () => router.back() }}
          right={{ label: "保存", onPress: onSave, disabled: saving }}
        />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="タイトル（必須）" error={titleError}>
            <Input value={title} onChangeText={setTitle} placeholder="例: 進撃の巨人" invalid={!!titleError} autoFocus />
          </Field>
          <Field label="種別">
            <Segmented options={WORK_TYPE_OPTIONS} value={type} onChange={setType} />
          </Field>
          {hasSeasons(type) && (
            <>
              <Banner tone="info">アニメ・ドラマは「シーズン1」を自動で作ります。シーズンは後から足せます。</Banner>
              <Field label="シーズン1の話数（あとで入力してもよい）" error={episodesError}>
                <Input
                  value={episodes}
                  onChangeText={setEpisodes}
                  keyboardType="number-pad"
                  placeholder="例: 12"
                  invalid={!!episodesError}
                />
              </Field>
            </>
          )}
          <Field label={hasSeasons(type) ? "シーズン1の視聴状態" : "視聴状態"}>
            <Segmented options={WATCH_STATUS_OPTIONS} value={status} onChange={setStatus} />
          </Field>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg },
});
