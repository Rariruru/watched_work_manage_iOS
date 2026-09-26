import { useLocalSearchParams, useRouter } from "expo-router";
import { addSeason } from "@/api/works";
import { useSave } from "@/api/useSave";
import { DEFAULT_WATCH_STATUS } from "@/domain/types";
import type { Work } from "@/domain/types";
import { SeasonForm } from "@/components/works/SeasonForm";
import { WorkGate } from "@/components/works/WorkGate";

/** シーズンの追加（受け入れ基準26）。新しいシーズンは既存の一番下に並ぶ */
export default function NewSeason() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkGate id={id} title="シーズンを追加">{(work) => <Add work={work} />}</WorkGate>;
}

function Add({ work }: { work: Work }) {
  const router = useRouter();
  const { run, saving } = useSave();
  return (
    <SeasonForm
      title="シーズンを追加"
      initial={{ name: `シーズン${work.seasons.length + 1}`, episodeCount: 0, status: DEFAULT_WATCH_STATUS }}
      showStatus={false}
      saving={saving}
      onCancel={() => router.back()}
      onSubmit={async (v) => {
        const ok = await run(
          () => addSeason({ workId: work.id, name: v.name, episodeCount: v.episodeCount }),
          "保存しました",
          "シーズンを保存できませんでした"
        );
        if (ok) router.back();
      }}
    />
  );
}
