import { useRouter } from "expo-router";
import { useWorks } from "@/api/queries";
import { toAppError } from "@/api/errors";
import type { Season, Work } from "@/domain/types";
import { Header, Screen, StateView } from "@/components/common/ui";

/**
 * 作品・シーズンを id で開く画面の共通の入口。
 * 読み込み中・読み込み失敗・見つからない（削除済み）を、それぞれ別の表示にする
 */
function useGateFallback(title: string) {
  const router = useRouter();
  const works = useWorks();
  const back = { label: "‹ 戻る", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) };

  function render(state: "loading" | "error" | "missing") {
    return (
      <Screen>
        <Header title={title} left={back} />
        {state === "loading" && <StateView loading />}
        {state === "error" && (
          <StateView
            title="読み込めませんでした"
            message={toAppError(works.error, "通信状態を確かめて、もう一度お試しください").message}
            action={{ label: "再試行", onPress: () => works.refetch() }}
          />
        )}
        {state === "missing" && <StateView title="見つかりませんでした" message="削除された可能性があります" />}
      </Screen>
    );
  }
  return { works, render };
}

export function WorkGate(props: { id: string | undefined; title: string; children: (work: Work) => React.ReactNode }) {
  const { works, render } = useGateFallback(props.title);
  if (works.isError && !works.data) return render("error");
  if (works.isPending) return render("loading");
  const work = works.data.find((w) => w.id === props.id);
  if (!work) return render("missing");
  return <>{props.children(work)}</>;
}

export function SeasonGate(props: {
  id: string | undefined;
  title: string;
  children: (work: Work, season: Season) => React.ReactNode;
}) {
  const { works, render } = useGateFallback(props.title);
  if (works.isError && !works.data) return render("error");
  if (works.isPending) return render("loading");
  for (const work of works.data) {
    const season = work.seasons.find((s) => s.id === props.id);
    if (season) return <>{props.children(work, season)}</>;
  }
  return render("missing");
}
