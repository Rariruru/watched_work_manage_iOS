import { useCallback, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from "react-native";
import { createRecord, photoDraftFromStored, updateRecord } from "@/api/records";
import type { PhotoDraft } from "@/api/records";
import { useSave } from "@/api/useSave";
import { RECORD_KIND_LABEL } from "@/domain/labels";
import {
  normalizeOccurredOn,
  normalizeRecordText,
  validateLocation,
  validateOccurredOn,
  validateRecordName,
} from "@/domain/records";
import { todayString } from "@/domain/reviews";
import type { RecordKind, Work, WorkRecord } from "@/domain/types";
import { useDialog } from "@/components/common/dialog";
import { Banner, Field, Header, Input, Screen } from "@/components/common/ui";
import { LocationPicker } from "./LocationPicker";
import { RecordPhotoPicker } from "./PhotoPicker";
import { color, spacing, text } from "@/theme/tokens";

type LocationValue = { latitude: number; longitude: number } | null;

export function RecordEditor(props: {
  work: Work;
  kind: RecordKind;
  record?: WorkRecord;
  onSaved: (recordId: string) => void;
  onCancel: () => void;
  footer?: React.ReactNode;
}) {
  const dialog = useDialog();
  const { run, saving } = useSave();
  const initialDate = props.record?.occurredOn ?? todayString(new Date());
  const [name, setName] = useState(props.record?.name ?? "");
  const [occurredOn, setOccurredOn] = useState(initialDate);
  const [memo, setMemo] = useState(props.record?.memo ?? "");
  const [location, setLocation] = useState<LocationValue>(
    props.record?.latitude !== null && props.record?.latitude !== undefined && props.record.longitude !== null
      ? { latitude: props.record.latitude, longitude: props.record.longitude }
      : null
  );
  const [photos, setPhotos] = useState<PhotoDraft[]>(props.record?.photos.map(photoDraftFromStored) ?? []);
  const [nameError, setNameError] = useState<string | null>(null);
  const [dateError, setDateError] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const changeLocation = useCallback((value: LocationValue) => {
    setTouched(true);
    setLocation(value);
  }, []);

  const change = <T,>(setter: (value: T) => void) => (value: T) => {
    setTouched(true);
    setter(value);
  };

  async function close() {
    if (touched) {
      const discard = await dialog.confirm({
        title: "入力を破棄しますか？",
        message: "保存していない内容と写真は消えます。",
        confirmLabel: "破棄する",
        destructive: true,
      });
      if (!discard) return;
    }
    props.onCancel();
  }

  async function save() {
    const nextNameError = validateRecordName(name);
    const nextDateError = validateOccurredOn(occurredOn);
    const nextLocationError = validateLocation(props.kind, location?.latitude ?? null, location?.longitude ?? null);
    setNameError(nextNameError);
    setDateError(nextDateError);
    setLocationError(nextLocationError);
    if (nextNameError || nextDateError || nextLocationError) return;

    setPhotos((items) => items.map((photo) => ({ ...photo, failed: false })));
    let savedId = props.record?.id ?? "";
    const input = {
      workId: props.work.id,
      kind: props.kind,
      name: name.trim(),
      occurredOn: normalizeOccurredOn(occurredOn),
      memo: normalizeRecordText(memo),
      latitude: location?.latitude ?? null,
      longitude: location?.longitude ?? null,
      photos,
    };
    const onPhotoFailure = (id: string) =>
      setPhotos((items) => items.map((photo) => (photo.id === id ? { ...photo, failed: true } : photo)));

    const ok = await run(
      async () => {
        if (props.record) await updateRecord(props.record, input, onPhotoFailure);
        else savedId = await createRecord(input, onPhotoFailure);
      },
      "保存しました",
      "記録を保存できませんでした"
    );
    if (ok) props.onSaved(savedId);
  }

  const nameLabel = { pilgrimage: "場所名", goods: "グッズ名", event: "イベント名" }[props.kind];
  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Screen>
        <Header
          title={props.record ? "記録を編集" : `${RECORD_KIND_LABEL[props.kind]}を記録`}
          left={{ label: "キャンセル", onPress: close }}
          right={{ label: "保存", onPress: save, disabled: saving }}
        />
        <ScrollView contentContainerStyle={styles.body} keyboardShouldPersistTaps="handled">
          <Banner tone="info">
            {props.work.title} · {RECORD_KIND_LABEL[props.kind]}
            {props.record ? "（種類と作品は変更できません）" : ""}
          </Banner>
          <Field label={`${nameLabel}（必須）`} error={nameError}>
            <Input value={name} onChangeText={change(setName)} invalid={!!nameError} autoFocus={!props.record} />
          </Field>
          <Field label="日付" error={dateError}>
            <Input
              value={occurredOn}
              onChangeText={change(setOccurredOn)}
              placeholder="2026-09-27"
              invalid={!!dateError}
              keyboardType="numbers-and-punctuation"
            />
          </Field>
          <Field label="写真（4枚まで・1枚10MB以下）">
            <RecordPhotoPicker photos={photos} onChange={change(setPhotos)} disabled={saving} onRetry={save} />
          </Field>
          {props.kind !== "goods" ? (
            <Field label="位置（任意）" error={locationError}>
              <LocationPicker
                value={location}
                onChange={changeLocation}
                disabled={saving}
                autoGeocode={props.kind === "pilgrimage"}
                searchText={name}
              />
            </Field>
          ) : null}
          <Field label="メモ（任意）">
            <Input value={memo} onChangeText={change(setMemo)} multiline numberOfLines={5} style={styles.memo} />
          </Field>
          {photos.some((photo) => photo.failed) ? (
            <Text style={styles.failure}>失敗した写真を外すか、再試行してください。記録はまだ保存されていません。</Text>
          ) : null}
          {props.footer}
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg, paddingBottom: spacing.xxl },
  memo: { minHeight: 120, paddingTop: spacing.md, textAlignVertical: "top" },
  failure: { color: color.danger, fontSize: text.label, lineHeight: 19 },
});
