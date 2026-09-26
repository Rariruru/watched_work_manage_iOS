import { StyleSheet, Text, View } from "react-native";
import { saveSeriesRating } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Work } from "@/domain/types";
import { UNRATED_LABEL } from "@/domain/labels";
import { formatAverage, seriesRating } from "@/domain/reviews";
import { StarDisplay, StarInput } from "@/components/common/StarRating";
import { color, radius, spacing, text } from "@/theme/tokens";

/**
 * アニメ・ドラマの作品全体の評価の表示。
 * 手動の評価があれば★、無ければ評価の付いたシーズンの平均を「★ 4.5（平均）」で出す
 */
export function SeriesRatingDisplay({ work, size = text.caption }: { work: Work; size?: number }) {
  const r = seriesRating(work);
  if (r.kind === "manual") return <StarDisplay rating={r.rating} size={size} />;
  if (r.kind === "none") return <Text style={[styles.muted, { fontSize: size }]}>{UNRATED_LABEL}</Text>;
  return (
    <Text style={{ fontSize: size }} accessibilityLabel={`平均 ${formatAverage(r.value)}`}>
      <Text style={styles.star}>★ {formatAverage(r.value)}</Text>
      <Text style={styles.muted}>（平均）</Text>
    </Text>
  );
}

/**
 * 作品詳細（D-a）の「作品全体の評価」。★を押すと手動の評価になり、その場で保存する。
 * 「平均に戻す」で手動の評価を消す
 */
export function SeriesRatingEditor({ work }: { work: Work }) {
  const { run, saving } = useSave();
  const r = seriesRating(work);

  return (
    <View style={styles.box}>
      <View style={styles.row}>
        <SeriesRatingDisplay work={work} size={text.title} />
        <Text style={styles.note}>
          {r.kind === "manual" ? "手動で付けた評価" : "評価の付いたシーズンの平均"}
        </Text>
      </View>
      <StarInput
        value={work.rating}
        clearLabel="平均に戻す"
        emptyLabel="★を押すと手動で付けられます"
        disabled={saving}
        onChange={(rating) =>
          run(
            () => saveSeriesRating(work.id, rating),
            rating === null ? "平均に戻しました" : "保存しました",
            "作品全体の評価を保存できませんでした"
          )
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  star: { color: color.star },
  muted: { color: color.muted },
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  note: { fontSize: text.caption, color: color.muted },
});
