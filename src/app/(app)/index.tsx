import { useMemo, useState } from "react";
import { FlatList, StyleSheet, View } from "react-native";
import { useRouter } from "expo-router";
import { useWorks } from "@/api/queries";
import { toAppError } from "@/api/errors";
import { buildListRows, isFiltered } from "@/domain/works";
import type { ListFilter, ListMode } from "@/domain/works";
import { Button, ChipRow, Header, Screen, Segmented, StateView } from "@/components/common/ui";
import { WorkListRow } from "@/components/works/WorkListRow";
import { LIST_MODE_OPTIONS, STATUS_FILTER_OPTIONS, TYPE_FILTER_OPTIONS } from "@/components/works/options";
import { spacing } from "@/theme/tokens";

const NO_FILTER: ListFilter = { type: "all", status: "all" };

/** B 作品一覧（受け入れ基準2・10・13・28） */
export default function WorkList() {
  const router = useRouter();
  const works = useWorks();
  const [mode, setMode] = useState<ListMode>("work");
  const [filter, setFilter] = useState<ListFilter>(NO_FILTER);

  const rows = useMemo(
    () => (works.data ? buildListRows(works.data, mode, filter) : []),
    [works.data, mode, filter]
  );

  const header = (
    <Header
      title="作品"
      left={{ label: "設定", onPress: () => router.push("/settings") }}
      right={{ label: "＋ 追加", onPress: () => router.push("/works/new") }}
    />
  );

  // ⚠️ 読み込み失敗と0件を混ぜない（受け入れ基準13）。失敗の判定を先に行う
  if (works.isError && !works.data) {
    return (
      <Screen>
        {header}
        <StateView
          title="読み込めませんでした"
          message={toAppError(works.error, "通信状態を確かめて、もう一度お試しください").message}
          action={{ label: "再試行", onPress: () => works.refetch() }}
        />
      </Screen>
    );
  }

  if (works.isPending) {
    return (
      <Screen>
        {header}
        <StateView loading />
      </Screen>
    );
  }

  if (works.data.length === 0) {
    return (
      <Screen>
        {header}
        <StateView
          title="まだ作品がありません"
          message="観た作品を追加して、記録を残しましょう"
          action={{ label: "作品を追加", onPress: () => router.push("/works/new") }}
        />
      </Screen>
    );
  }

  return (
    <Screen>
      {header}
      <View style={styles.controls}>
        <Segmented options={LIST_MODE_OPTIONS} value={mode} onChange={setMode} />
        <ChipRow
          options={TYPE_FILTER_OPTIONS}
          value={filter.type}
          onChange={(type) => setFilter((f) => ({ ...f, type }))}
        />
        <ChipRow
          options={STATUS_FILTER_OPTIONS}
          value={filter.status}
          onChange={(status) => setFilter((f) => ({ ...f, status }))}
        />
      </View>
      <FlatList
        data={rows}
        keyExtractor={(r) => r.key}
        contentContainerStyle={styles.list}
        onRefresh={() => works.refetch()}
        refreshing={works.isRefetching}
        renderItem={({ item }) => (
          <WorkListRow
            row={item}
            onPress={() =>
              item.kind === "season"
                ? router.push({ pathname: "/seasons/[id]", params: { id: item.season.id } })
                : router.push({ pathname: "/works/[id]", params: { id: item.work.id } })
            }
          />
        )}
        ListEmptyComponent={
          isFiltered(filter) ? (
            <View style={styles.empty}>
              <StateView title="条件に合う作品がありません" />
              <Button label="絞り込みを解除" variant="secondary" small onPress={() => setFilter(NO_FILTER)} style={{ alignSelf: "center" }} />
            </View>
          ) : null
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  controls: { padding: spacing.lg, gap: spacing.sm },
  list: { paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, gap: spacing.sm },
  empty: { paddingVertical: spacing.xxl, gap: spacing.md },
});
