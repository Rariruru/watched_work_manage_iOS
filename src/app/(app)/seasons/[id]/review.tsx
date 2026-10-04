import { useLocalSearchParams, useRouter } from "expo-router";
import { saveSeasonReview } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Season } from "@/domain/types";
import { formatAverage, seasonRating } from "@/domain/reviews";
import { ReviewForm } from "@/components/works/ReviewForm";
import { SeasonGate } from "@/components/works/WorkGate";

/** シーズン全体の感想・手動評価の編集（基準6・7・42） */
export default function SeasonReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeasonGate id={id} title="感想">{(_work, season) => <Edit season={season} />}</SeasonGate>;
}

function Edit({ season }: { season: Season }) {
  const router = useRouter();
  const { run, saving } = useSave();
  const displayRating = seasonRating(season);
  const ratingHint =
    displayRating.kind === "average"
      ? `現在は評価済み各話の平均 ${formatAverage(displayRating.value)} です。★を押すと手動評価を優先します。`
      : displayRating.kind === "manual" && season.episodes.some((episode) => episode.rating !== null)
        ? "手動評価を表示中です。「平均に戻す」と各話の平均へ戻ります。"
        : "評価済みの話があると、その平均を自動表示します。";
  return (
    <ReviewForm
      title={`${season.name}の感想`}
      initial={{ status: season.status, rating: season.rating, watchedOn: season.watchedOn, review: season.review }}
      saving={saving}
      ratingClearLabel="平均に戻す"
      ratingEmptyLabel="手動評価なし"
      ratingHint={ratingHint}
      onCancel={() => router.back()}
      onSubmit={async (input) => {
        const ok = await run(() => saveSeasonReview(season.id, input), "保存しました", "感想を保存できませんでした");
        if (ok) router.back();
      }}
    />
  );
}
