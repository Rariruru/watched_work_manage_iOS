import { useState } from "react";
import { KeyboardAvoidingView, Modal, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { setEpisodeReview } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Rating, Season } from "@/domain/types";
import { episodeLabel } from "@/domain/labels";
import { findEpisodeReview, isEmptyEpisodeReview, normalizeReviewText } from "@/domain/reviews";
import { StarInput } from "@/components/common/StarRating";
import { Button, Field, Input } from "@/components/common/ui";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

/**
 * EP 話の評価（基準7・25）。シーズンの評価とは独立に保存する。
 * 評価も一言感想も空で保存すると、その話は「未評価」に戻る
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

  async function onSave() {
    const normalized = normalizeReviewText(comment);
    const clearing = isEmptyEpisodeReview(rating, normalized);
    const ok = await run(
      () => setEpisodeReview(season.id, number, rating, normalized),
      clearing ? "未評価に戻しました" : "保存しました",
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
            <Text style={styles.title}>{episodeLabel(number)}</Text>
            <Pressable accessibilityRole="button" onPress={onClose} hitSlop={8} style={styles.close}>
              <Text style={styles.closeLabel}>閉じる</Text>
            </Pressable>
          </View>
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
  title: { fontSize: text.title, fontWeight: "700", color: color.ink },
  close: { minHeight: HIT_SIZE, justifyContent: "center" },
  closeLabel: { color: color.brand, fontSize: text.body, fontWeight: "700" },
  comment: { minHeight: 72, paddingTop: spacing.md, textAlignVertical: "top" },
});
