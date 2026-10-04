import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import type { ReviewInput } from "@/api/works";
import type { Rating, WatchStatus } from "@/domain/types";
import { normalizeReviewText, normalizeWatchedOn, todayString, validateWatchedOn } from "@/domain/reviews";
import { StarInput } from "@/components/common/StarRating";
import { Button, Field, Header, Input, Screen, Segmented } from "@/components/common/ui";
import { WATCH_STATUS_OPTIONS } from "./options";
import { color, spacing, text } from "@/theme/tokens";

/**
 * E 感想・評価の編集。映画（作品）とシーズン全体で同じ画面（基準6・7）。
 * 検証に通ったときだけ onSubmit を呼ぶ。保存に失敗しても入力は残る
 */
export function ReviewForm(props: {
  title: string;
  initial: { status: WatchStatus; rating: Rating | null; watchedOn: string | null; review: string | null };
  saving: boolean;
  ratingClearLabel?: string;
  ratingEmptyLabel?: string;
  ratingHint?: string;
  onCancel: () => void;
  onSubmit: (input: ReviewInput) => void;
}) {
  const [status, setStatus] = useState<WatchStatus>(props.initial.status);
  const [rating, setRating] = useState<Rating | null>(props.initial.rating);
  const [watchedOn, setWatchedOn] = useState(props.initial.watchedOn ?? "");
  const [review, setReview] = useState(props.initial.review ?? "");
  const [dateError, setDateError] = useState<string | null>(null);

  function submit() {
    const err = validateWatchedOn(watchedOn);
    setDateError(err);
    if (err) return;
    props.onSubmit({
      status,
      rating,
      watchedOn: normalizeWatchedOn(watchedOn),
      review: normalizeReviewText(review),
    });
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
          <Field label="視聴状態">
            <Segmented options={WATCH_STATUS_OPTIONS} value={status} onChange={setStatus} />
          </Field>
          <Field label="評価（任意）">
            <StarInput
              value={rating}
              onChange={setRating}
              clearLabel={props.ratingClearLabel}
              emptyLabel={props.ratingEmptyLabel}
            />
            {props.ratingHint ? <Text style={styles.hint}>{props.ratingHint}</Text> : null}
          </Field>
          <Field label="視聴日（任意）" error={dateError}>
            <View style={styles.dateRow}>
              <Input
                value={watchedOn}
                onChangeText={setWatchedOn}
                placeholder="2026-09-26"
                keyboardType="numbers-and-punctuation"
                autoCorrect={false}
                invalid={!!dateError}
                style={{ flex: 1 }}
              />
              <Button label="今日" variant="secondary" small onPress={() => setWatchedOn(todayString(new Date()))} />
            </View>
          </Field>
          <Field label="感想">
            <Input
              value={review}
              onChangeText={setReview}
              multiline
              textAlignVertical="top"
              placeholder="観て思ったこと"
              style={styles.review}
            />
          </Field>
        </ScrollView>
      </Screen>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.lg },
  dateRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  review: { minHeight: 140, paddingTop: spacing.md },
  hint: { color: color.muted, fontSize: text.caption },
});
