import { Text } from "react-native";
import type { Season } from "@/domain/types";
import { UNRATED_LABEL } from "@/domain/labels";
import { formatAverage, seasonRating } from "@/domain/reviews";
import { StarDisplay } from "@/components/common/StarRating";
import { color, text } from "@/theme/tokens";

/** 手動評価を優先し、なければ評価済み各話の平均を表示する（基準42） */
export function SeasonRatingDisplay({ season, size = text.caption }: { season: Season; size?: number }) {
  const result = seasonRating(season);
  if (result.kind === "manual") return <StarDisplay rating={result.rating} size={size} />;
  if (result.kind === "none") return <Text style={{ color: color.muted, fontSize: size }}>{UNRATED_LABEL}</Text>;
  return (
    <Text style={{ fontSize: size }} accessibilityLabel={`各話の平均 ${formatAverage(result.value)}`}>
      <Text style={{ color: color.star }}>★ {formatAverage(result.value)}</Text>
      <Text style={{ color: color.muted }}>（各話の平均）</Text>
    </Text>
  );
}
