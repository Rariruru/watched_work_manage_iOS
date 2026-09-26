import { useLocalSearchParams, useRouter } from "expo-router";
import { deleteSeason, updateSeason } from "@/api/works";
import { useSave } from "@/api/useSave";
import type { Season, Work } from "@/domain/types";
import { canDeleteSeason } from "@/domain/works";
import { episodesLostOnShrink } from "@/domain/reviews";
import { episodeLabel } from "@/domain/labels";
import { useDialog } from "@/components/common/dialog";
import { Banner, Button } from "@/components/common/ui";
import { SeasonForm } from "@/components/works/SeasonForm";
import { SeasonGate } from "@/components/works/WorkGate";

/**
 * シーズンの編集・削除（受け入れ基準26・27・33）。
 * 話数を減らして評価の付いた話が範囲外になるときは確認を出す。範囲外の話の評価は DB のトリガが消す
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
      message: "このシーズンの評価・感想と、各話の評価もすべて消え、元に戻せません。",
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
        // 評価・一言感想・タイトルのある話が範囲外になるなら確認する（基準27）
        const lost = episodesLostOnShrink(season, v.episodeCount);
        if (lost.length > 0) {
          const proceed = await dialog.confirm({
            title: `第${v.episodeCount + 1}〜${season.episodeCount}話の評価が消えます`,
            message: `${lost.map(episodeLabel).join("・")}に評価・一言感想・タイトルのどれかが付いています。話数を${v.episodeCount}にすると、それらは消え、元に戻せません。`,
            confirmLabel: `${v.episodeCount}話にする`,
            destructive: true,
          });
          if (!proceed) return;
        }
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
