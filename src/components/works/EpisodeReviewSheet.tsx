import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setEpisodeReview } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Rating, Season } from "@/domain/types";
import { episodeHeading } from "@/domain/labels";
import { findEpisodeReview, isEmptyEpisodeReview, normalizeReviewText } from "@/domain/reviews";
import { StarInput } from "@/components/common/StarRating";
import { Button, Field, Input } from "@/components/common/ui";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

/**
 * EP 話の評価（基準7・25）とタイトル。シーズンの評価とは独立に保存する。
 * 評価・一言感想・タイトルを全部空で保存すると、その話の記録は消える
 */
export function EpisodeReviewSheet(props: { season: Season; number: number | null; onClose: () => void }) {
  return (
    <Modal visible={props.number !== null} transparent animationType="slide" onRequestClose={props.onClose}>
      {props.number !== null && (
        // key で話ごとに入力欄を作り直す（前の話の入力が残らないように）
        <SheetBody key={props.number} season={props.season} number={props.number} onClose={props.onClose} />
      )}
    </Modal>
  );
}

function SheetBody({ season, number, onClose }: { season: Season; number: number; onClose: () => void }) {
  const insets = useSafeAreaInsets();
  const { run, saving } = useSave();
  const existing = findEpisodeReview(season, number);
  const [rating, setRating] = useState<Rating | null>(existing?.rating ?? null);
  const [comment, setComment] = useState(existing?.comment ?? "");
  const [title, setTitle] = useState(existing?.title ?? "");

  async function onSave() {
    const normalizedComment = normalizeReviewText(comment);
    const normalizedTitle = normalizeReviewText(title);
    const clearing = isEmptyEpisodeReview(rating, normalizedComment, normalizedTitle);
    const ok = await run(
      () => setEpisodeReview(season.id, number, { rating, comment: normalizedComment, title: normalizedTitle }),
      clearing ? "話の記録を消しました" : "保存しました",
      "話の評価を保存できませんでした"
    );
    if (ok) onClose();
  }

  return (
    <View style={styles.backdrop}>
      <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="閉じる" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <View style={[styles.sheet, { paddingBottom: insets.bottom + spacing.lg }]}>
          <View style={styles.head}>
            <Text style={styles.title} numberOfLines={1}>
              {episodeHeading(number, normalizeReviewText(title))}
            </Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={styles.close}>
              <Text style={styles.closeLabel}>閉じる</Text>
            </Pressable>
          </View>
          <Field label="タイトル（任意）">
            <Input value={title} onChangeText={setTitle} placeholder="例: 南西へ" />
          </Field>
          <Field label="評価（任意）">
            <StarInput value={rating} onChange={setRating} />
          </Field>
          <Field label="一言感想（任意）">
            <Input value={comment} onChangeText={setComment} placeholder="この話で思ったこと" multiline style={styles.comment} />
          </Field>
          <Button label="保存" onPress={onSave} loading={saving} />
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: color.backdrop },
  sheet: {
    backgroundColor: color.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.lg,
  },
  head: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  title: { flex: 1, fontSize: text.title, fontWeight: "700", color: color.ink },
  close: { minHeight: HIT_SIZE, justifyContent: "center" },
  closeLabel: { color: color.brand, fontSize: text.body, fontWeight: "700" },
  comment: { minHeight: 72, paddingTop: spacing.md, textAlignVertical: "top" },
});
