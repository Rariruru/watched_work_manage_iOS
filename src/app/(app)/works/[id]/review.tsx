import { useLocalSearchParams, useRouter } from "expo-router";
import { saveMovieReview } from "@/api/works";
import { useSave } from "@/api/useSave";
import { DEFAULT_WATCH_STATUS } from "@/domain/types";
import type { Work } from "@/domain/types";
import { hasSeasons } from "@/domain/works";
import { Screen, StateView } from "@/components/common/ui";
import { ReviewForm } from "@/components/works/ReviewForm";
import { WorkGate } from "@/components/works/WorkGate";

/** 映画の感想・評価の編集（基準6・7） */
export default function MovieReview() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkGate id={id} title="感想">{(work) => <Edit work={work} />}</WorkGate>;
}

function Edit({ work }: { work: Work }) {
  const router = useRouter();
  const { run, saving } = useSave();
  // アニメ・ドラマの感想はシーズンに持つ。種別が変わった直後などにここへ来たときの逃げ道
  if (hasSeasons(work.type)) {
    return (
      <Screen>
        <StateView title="アニメ・ドラマの感想はシーズンごとに付けます" action={{ label: "戻る", onPress: () => router.back() }} />
      </Screen>
    );
  }
  return (
    <ReviewForm
      title={`${work.title}の感想`}
      initial={{
        status: work.status ?? DEFAULT_WATCH_STATUS,
        rating: work.rating,
        watchedOn: work.watchedOn,
        review: work.review,
      }}
      saving={saving}
      onCancel={() => router.back()}
      onSubmit={async (input) => {
        const ok = await run(() => saveMovieReview(work.id, input), "保存しました", "感想を保存できませんでした");
        if (ok) router.back();
      }}
    />
  );
}
