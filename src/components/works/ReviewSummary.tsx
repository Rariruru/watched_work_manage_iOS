import type { ReactNode } from "react";
import { StyleSheet, Text, View } from "react-native";
import type { Rating, WatchStatus } from "@/domain/types";
import { WATCH_STATUS_LABEL } from "@/domain/labels";
import { StarDisplay } from "@/components/common/StarRating";
import { Button } from "@/components/common/ui";
import { color, radius, spacing, text } from "@/theme/tokens";

/** 映画の作品詳細（D-m）とシーズン詳細（S）の「感想・評価」欄。同じ見た目なので共通にする */
export function ReviewSummary(props: {
  status: WatchStatus;
  rating: Rating | null;
  watchedOn: string | null;
  review: string | null;
  ratingDisplay?: ReactNode;
  onEdit: () => void;
}) {
  return (
    <View style={styles.box}>
      <View style={styles.row}>
        {props.ratingDisplay ?? <StarDisplay rating={props.rating} size={text.title} />}
        <Text style={styles.meta}>
          {WATCH_STATUS_LABEL[props.status]}
          {props.watchedOn ? ` · ${props.watchedOn}` : ""}
        </Text>
      </View>
      {props.review ? <Text style={styles.review}>{props.review}</Text> : <Text style={styles.empty}>感想はまだありません</Text>}
      <Button label="感想・評価を編集" variant="secondary" small onPress={props.onEdit} />
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  meta: { fontSize: text.caption, color: color.muted },
  review: { fontSize: text.body, color: color.ink, lineHeight: 22 },
  empty: { fontSize: text.label, color: color.muted },
});
