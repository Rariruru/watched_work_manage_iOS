import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteSeason, updateSeason } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Season, Work } from "@/domain/types";
import { canDeleteSeason } from "@/domain/works";
import { useDialog } from "@/components/common/dialog";
import { Banner, Button } from "@/components/common/ui";
import { SeasonForm } from "@/components/works/SeasonForm";
import { SeasonGate } from "@/components/works/WorkGate";

/**
 * シーズンの編集・削除（受け入れ基準26・27・33）。
 * ⚠️ 基準27（評価の付いた話が消える確認）は、各話の評価を作る範囲で足す。今は話に評価が無いので確認を出さない
 */
export default function EditSeason() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeasonGate id={id} title="シーズン">{(work, season) => <Edit work={work} season={season} />}</SeasonGate>;
}

function Edit({ work, season }: { work: Work; season: Season }) {
  const router = useRouter();
  const dialog = useDialog();
  const { run, saving } = useSave();
  const deletable = canDeleteSeason(work);

  async function onDelete() {
    const proceed = await dialog.confirm({
      title: `「${season.name}」を削除しますか？`,
      message: "元に戻せません。",
      confirmLabel: "削除する",
      destructive: true,
    });
    if (!proceed) return;
    const ok = await run(() => deleteSeason(season.id), "削除しました", "シーズンを削除できませんでした");
    if (ok) router.dismissTo({ pathname: "/works/[id]", params: { id: work.id } });
  }

  return (
    <SeasonForm
      title="シーズン"
      initial={{ name: season.name, episodeCount: season.episodeCount, status: season.status }}
      showStatus
      saving={saving}
      onCancel={() => router.back()}
      onSubmit={async (v) => {
        const ok = await run(() => updateSeason(season.id, v), "保存しました", "シーズンを保存できませんでした");
        if (ok) router.back();
      }}
      footer={
        // 最後の1シーズンには削除ボタンを出さない（基準33）
        deletable ? (
          <Button label="このシーズンを削除" variant="danger" small onPress={onDelete} disabled={saving} />
        ) : (
          <Banner tone="info">最後の1シーズンは削除できません。作品ごと削除するときは作品の編集から行います。</Banner>
        )
      }
    />
  );
}
