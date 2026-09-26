import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { changeWorkType, deleteWork, updateWork } from "@/api/works";
import { useWorks } from "@/api/queries";
import { useSave } from "@/api/useSave";
import type { WatchStatus, Work, WorkType } from "@/domain/types";
import { WORK_TYPE_LABEL } from "@/domain/labels";
import { findDuplicate, hasSeasons, normalizeTitle, typeChangeEffect, validateTitle } from "@/domain/works";
import { useDialog } from "@/components/common/dialog";
import { Banner, Button, Field, Header, Input, Screen, Segmented } from "@/components/common/ui";
import { WorkGate } from "@/components/works/WorkGate";
import { WATCH_STATUS_OPTIONS, WORK_TYPE_OPTIONS } from "@/components/works/options";
import { spacing } from "@/theme/tokens";

/** 作品の編集・削除（受け入れ基準11・17・31・32） */
export default function EditWork() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkGate id={id} title="作品を編集">{(work) => <Form work={work} />}</WorkGate>;
}

function Form({ work }: { work: Work }) {
  const router = useRouter();
  const dialog = useDialog();
  const works = useWorks();
  const { run, saving } = useSave();

  const [title, setTitle] = useState(work.title);
  const [type, setType] = useState<WorkType>(work.type);
  const [status, setStatus] = useState<WatchStatus | null>(work.status);
  const [titleError, setTitleError] = useState<string | null>(null);

  const effect = typeChangeEffect(work.type, type);
  // 映画のまま編集しているときだけ、作品の視聴状態を編集できる
  const editsMovieStatus = work.type === "movie" && type === "movie";

  async function onSave() {
    const tErr = validateTitle(title);
    setTitleError(tErr);
    if (tErr) return;

    const duplicate = findDuplicate(works.data ?? [], title, type, work.id);
    if (duplicate) {
      const proceed = await dialog.confirm({
        title: "既に登録されています",
        message: `「${duplicate.title}」（${WORK_TYPE_LABEL[type]}）は既に作品リストにあります。それでも保存しますか？`,
        confirmLabel: "保存する",
      });
      if (!proceed) return;
    }

    if (effect === "drop-seasons") {
      const proceed = await dialog.confirm({
        title: "シーズンがすべて消えます",
        message: `映画に変えると、${work.seasons.length}つのシーズンと話数が消え、元に戻せません。`,
        confirmLabel: "映画に変更",
        destructive: true,
      });
      if (!proceed) return;
    }

    const titleChanged = normalizeTitle(title) !== work.title;
    const ok = await run(
      async () => {
        // ⚠️ 種別の変更（シーズンの作成・削除）は DB の change_work_type が1トランザクションで行う
        if (effect !== "none") await changeWorkType(work.id, type);
        const patch: { title?: string; status?: WatchStatus } = {};
        if (titleChanged) patch.title = normalizeTitle(title);
        if (editsMovieStatus && status && status !== work.status) patch.status = status;
        if (Object.keys(patch).length > 0) await updateWork(work.id, patch);
      },
      "保存しました",
      "作品を保存できませんでした"
    );
    if (ok) router.back();
  }

  async function onDelete() {
    const proceed = await dialog.confirm({
      title: `「${work.title}」を削除しますか？`,
      message: hasSeasons(work.type) ? "シーズンもすべて消え、元に戻せません。" : "元に戻せません。",
      confirmLabel: "削除する",
      destructive: true,
    });
    if (!proceed) return;
    const ok = await run(() => deleteWork(work.id), "削除しました", "作品を削除できませんでした");
    if (ok) router.dismissTo("/");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Header
          title="作品を編集"
          left={{ label: "キャンセル", onPress: () => router.back() }}
          right={{ label: "保存", onPress: onSave, disabled: saving }}
        />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Field label="タイトル（必須）" error={titleError}>
            <Input value={title} onChangeText={setTitle} invalid={!!titleError} />
          </Field>
          <Field label="種別">
            <Segmented options={WORK_TYPE_OPTIONS} value={type} onChange={setType} />
          </Field>
          {effect === "drop-seasons" && (
            <Banner tone="warn">映画に変えると、シーズンと話数がすべて消えます。保存の前に確認を出します。</Banner>
          )}
          {effect === "create-first-season" && (
            <Banner tone="info">「シーズン1」を作り、映画の視聴状態と視聴日をシーズン1に移します。</Banner>
          )}
          {editsMovieStatus && status && (
            <Field label="視聴状態">
              <Segmented options={WATCH_STATUS_OPTIONS} value={status} onChange={setStatus} />
            </Field>
          )}
          <Button label="この作品を削除" variant="danger" small onPress={onDelete} disabled={saving} />
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg },
});
