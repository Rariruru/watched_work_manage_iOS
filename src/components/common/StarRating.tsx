import { Pressable, StyleSheet, Text, View } from "react-native";
import { RATINGS } from "@/domain/types";
import type { Rating } from "@/domain/types";
import { ratingLabel, UNRATED_LABEL } from "@/domain/labels";
import { color, HIT_SIZE, spacing, text } from "@/theme/tokens";

/** ★の表示。未評価は「未評価」と文字で出す（0個の★で出さない） */
export function StarDisplay({ rating, size = text.label }: { rating: Rating | null; size?: number }) {
  if (rating === null) return <Text style={[styles.unrated, { fontSize: size }]}>{UNRATED_LABEL}</Text>;
  return (
    <Text style={[styles.stars, { fontSize: size }]} accessibilityLabel={`評価 ${rating}`}>
      {ratingLabel(rating)}
    </Text>
  );
}

/**
 * ★の入力（1〜5）と「評価を外す」（基準7）。
 * 同じ★をもう一度押しても外さない（誤って消えないように。外すのは「評価を外す」だけ）
 */
export function StarInput({
  value,
  onChange,
  clearLabel = "評価を外す",
  emptyLabel = UNRATED_LABEL,
  disabled,
}: {
  value: Rating | null;
  onChange: (value: Rating | null) => void;
  /** 評価を外すボタンの文言（作品全体の評価では「平均に戻す」） */
  clearLabel?: string;
  /** 未評価のときに右に出す文言 */
  emptyLabel?: string;
  disabled?: boolean;
}) {
  return (
    <View style={styles.inputRow}>
      <View style={styles.starsRow} accessibilityRole="adjustable" accessibilityLabel={`評価 ${value ?? UNRATED_LABEL}`}>
        {RATINGS.map((n) => (
          <Pressable
            key={n}
            accessibilityRole="button"
            accessibilityLabel={`${n}`}
            onPress={() => onChange(n)}
            disabled={disabled}
            hitSlop={4}
            style={styles.starButton}
          >
            <Text style={[styles.starBig, { color: value !== null && n <= value ? color.star : color.line }]}>★</Text>
          </Pressable>
        ))}
      </View>
      {value !== null ? (
        <Pressable
          accessibilityRole="button"
          onPress={() => onChange(null)}
          disabled={disabled}
          hitSlop={8}
          style={styles.clear}
        >
          <Text style={styles.clearLabel}>{clearLabel}</Text>
        </Pressable>
      ) : (
        <Text style={styles.unrated}>{emptyLabel}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stars: { color: color.star, letterSpacing: 1 },
  unrated: { color: color.muted, fontSize: text.label, flexShrink: 1 },
  inputRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.md },
  starsRow: { flexDirection: "row" },
  starButton: { minWidth: HIT_SIZE, minHeight: HIT_SIZE, alignItems: "center", justifyContent: "center" },
  starBig: { fontSize: 30 },
  clear: { minHeight: HIT_SIZE, justifyContent: "center" },
  clearLabel: { color: color.brand, fontSize: text.label, fontWeight: "700" },
});
