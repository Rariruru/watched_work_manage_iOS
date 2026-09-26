import { Pressable, StyleSheet, Text, View } from "react-native";
import { WATCH_STATUS_LABEL, WORK_TYPE_LABEL } from "@/domain/labels";
import type { ListRow } from "@/domain/works";
import type { Rating } from "@/domain/types";
import { StarDisplay } from "@/components/common/StarRating";
import { SeriesRatingDisplay } from "./SeriesRating";
import { color, radius, spacing, text } from "@/theme/tokens";

/**
 * 作品一覧の1行（B / B-s）。
 * アニメ・ドラマの「作品ごと」の行は、作品全体の評価（手動か、シーズンの平均）を出す
 * （2026-09-26 上田の決定。前は作品全体の評価を出さなかった）
 */
export function WorkListRow({ row, onPress }: { row: ListRow; onPress: () => void }) {
  const { title, sub, rating } = describe(row);
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && { opacity: 0.7 }]}
    >
      <View style={styles.thumb} />
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={2}>
          {title}
        </Text>
        <Text style={styles.sub}>{sub}</Text>
        {row.kind === "series" ? (
          <SeriesRatingDisplay work={row.work} />
        ) : (
          rating !== undefined && <StarDisplay rating={rating} size={text.caption} />
        )}
      </View>
    </Pressable>
  );
}

/** 映画・シーズンの行の評価。作品ごと表示のアニメ・ドラマは SeriesRatingDisplay で出す */
function describe(row: ListRow): { title: string; sub: string; rating?: Rating | null } {
  const type = WORK_TYPE_LABEL[row.work.type];
  switch (row.kind) {
    case "movie":
      return {
        title: row.work.title,
        sub: [type, row.work.status ? WATCH_STATUS_LABEL[row.work.status] : null].filter(Boolean).join(" · "),
        rating: row.work.rating,
      };
    case "series":
      return { title: row.work.title, sub: `${type} · ${row.seasonCount}シーズン` };
    case "season":
      return {
        title: `${row.work.title} ${row.season.name}`,
        sub: `${type} · ${WATCH_STATUS_LABEL[row.season.status]} · ${
          row.season.episodeCount > 0 ? `全${row.season.episodeCount}話` : "話数未入力"
        }`,
        rating: row.season.rating,
      };
  }
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  thumb: { width: 42, height: 56, borderRadius: radius.sm, backgroundColor: color.brandSoft },
  copy: { flex: 1, justifyContent: "center", gap: 2 },
  title: { fontSize: text.body, fontWeight: "700", color: color.ink },
  sub: { fontSize: text.caption, color: color.muted },
});
