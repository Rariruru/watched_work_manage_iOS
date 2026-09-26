import { useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { episodeLabel } from "@/domain/labels";
import { commentPreview, findEpisodeReview } from "@/domain/reviews";
import { episodeNumbers } from "@/domain/works";
import type { Season, Work } from "@/domain/types";
import { StarDisplay } from "@/components/common/StarRating";
import { Header, Screen, SectionTitle, StateView } from "@/components/common/ui";
import { EpisodeReviewSheet } from "@/components/works/EpisodeReviewSheet";
import { ReviewSummary } from "@/components/works/ReviewSummary";
import { SeasonGate } from "@/components/works/WorkGate";
import { color, radius, spacing, text } from "@/theme/tokens";

/**
 * S シーズン詳細（受け入れ基準6・7・24・25・34）。
 * シーズン全体の評価と各話の評価は独立。シーズンの評価を各話から計算しない・平均も出さない
 */
export default function SeasonDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <SeasonGate id={id} title="シーズン">{(work, season) => <Detail work={work} season={season} />}</SeasonGate>;
}

function Detail({ work, season }: { work: Work; season: Season }) {
  const router = useRouter();
  const [openNumber, setOpenNumber] = useState<number | null>(null);
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
            <ReviewSummary
              status={season.status}
              rating={season.rating}
              watchedOn={season.watchedOn}
              review={season.review}
              onEdit={() => router.push({ pathname: "/seasons/[id]/review", params: { id: season.id } })}
            />
            <SectionTitle>{episodes.length > 0 ? `各話（全${episodes.length}話）` : "各話"}</SectionTitle>
          </View>
        }
        renderItem={({ item }) => {
          const review = findEpisodeReview(season, item);
          return (
            <Pressable
              accessibilityRole="button"
              onPress={() => setOpenNumber(item)}
              style={({ pressed }) => [styles.episode, pressed && { opacity: 0.7 }]}
            >
              <Text style={styles.episodeLabel}>{episodeLabel(item)}</Text>
              <Text style={styles.comment} numberOfLines={1}>
                {commentPreview(review?.comment ?? null)}
              </Text>
              <StarDisplay rating={review?.rating ?? null} size={text.caption} />
            </Pressable>
          );
        }}
        // 話数0のとき（基準34）
        ListEmptyComponent={
          <StateView
            title="話数が入力されていません"
            message="話数を入れると、各話を評価できます"
            action={{ label: "話数を入力", onPress: openEdit }}
          />
        }
      />
      <EpisodeReviewSheet season={season} number={openNumber} onClose={() => setOpenNumber(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.xs, flexGrow: 1 },
  episode: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
  },
  episodeLabel: { width: 56, fontSize: text.label, color: color.muted },
  comment: { flex: 1, fontSize: text.label, color: color.ink },
});
