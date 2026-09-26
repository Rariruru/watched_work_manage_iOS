import { FlatList, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { episodeLabel, WATCH_STATUS_LABEL } from "@/domain/labels";
import { episodeNumbers } from "@/domain/works";
import type { Season, Work } from "@/domain/types";
import { Header, Screen, SectionTitle, StateView } from "@/components/common/ui";
import { SeasonGate } from "@/components/works/WorkGate";
import { color, radius, spacing, text } from "@/theme/tokens";

/**
 * S シーズン詳細（受け入れ基準24・34）。
 * 各話の評価・シーズンの評価と感想は次の範囲で足す（評価の刻みが未決のため）
 */
export default function SeasonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeasonGate id={id} title="シーズン">{(work, season) => <Detail work={work} season={season} />}</SeasonGate>;
}

function Detail({ work, season }: { work: Work; season: Season }) {
  const router = useRouter();
  const openEdit = () => router.push({ pathname: "/seasons/[id]/edit", params: { id: season.id } });
  const episodes = episodeNumbers(season.episodeCount);

  return (
    <Screen>
      <Header
        title={season.name}
        left={{ label: `‹ ${work.title}`, onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) }}
        right={{ label: "編集", onPress: openEdit }}
      />
      <FlatList
        data={episodes}
        keyExtractor={(n) => String(n)}
        contentContainerStyle={styles.body}
        ListHeaderComponent={
          <View style={{ gap: spacing.sm, marginBottom: spacing.sm }}>
            <SectionTitle>シーズン全体</SectionTitle>
            <Text style={styles.value}>{WATCH_STATUS_LABEL[season.status]}</Text>
            <SectionTitle>{episodes.length > 0 ? `各話（全${episodes.length}話）` : "各話"}</SectionTitle>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.episode}>
            <Text style={styles.episodeLabel}>{episodeLabel(item)}</Text>
          </View>
        )}
        // 話数0のとき（基準34）
        ListEmptyComponent={
          <StateView
            title="話数が入力されていません"
            message="話数を入れると、第1話から順に並びます"
            action={{ label: "話数を入力", onPress: openEdit }}
          />
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.xs, flexGrow: 1 },
  value: { fontSize: text.body, color: color.ink },
  episode: {
    padding: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  episodeLabel: { fontSize: text.body, color: color.ink },
});
