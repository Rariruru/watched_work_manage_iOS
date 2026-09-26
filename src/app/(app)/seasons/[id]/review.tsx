import { useLocalSearchParams, useRouter } from "expo-router";
import { saveSeasonReview } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Season } from "@/domain/types";
import { ReviewForm } from "@/components/works/ReviewForm";
import { SeasonGate } from "@/components/works/WorkGate";

/** シーズン全体の感想・評価の編集（基準6・7）。各話の評価とは独立 */
export default function SeasonReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeasonGate id={id} title="感想">{(_work, season) => <Edit season={season} />}</SeasonGate>;
}

function Edit({ season }: { season: Season }) {
  const router = useRouter();
  const { run, saving } = useSave();
  return (
    <ReviewForm
      title={`${season.name}の感想`}
      initial={{ status: season.status, rating: season.rating, watchedOn: season.watchedOn, review: season.review }}
      saving={saving}
      onCancel={() => router.back()}
      onSubmit={async (input) => {
        const ok = await run(() => saveSeasonReview(season.id, input), "保存しました", "感想を保存できませんでした");
        if (ok) router.back();
      }}
    />
  );
}
