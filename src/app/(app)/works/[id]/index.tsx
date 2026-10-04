import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { Image } from "expo-image";
import { useRecords } from "@/api/queries";
import { toAppError } from "@/api/errors";
import { RECORD_KIND_LABEL, WATCH_STATUS_LABEL, WORK_TYPE_LABEL } from "@/domain/labels";
import { hasSeasons } from "@/domain/works";
import { DEFAULT_WATCH_STATUS, RECORD_KINDS } from "@/domain/types";
import type { Work } from "@/domain/types";
import { StarDisplay } from "@/components/common/StarRating";
import { Banner, Button, Header, Screen, SectionTitle } from "@/components/common/ui";
import { ReviewSummary } from "@/components/works/ReviewSummary";
import { SeriesRatingEditor } from "@/components/works/SeriesRating";
import { WorkGate } from "@/components/works/WorkGate";
import { RecordCard } from "@/components/records/RecordCard";
import { color, radius, spacing, text } from "@/theme/tokens";

/** D 作品詳細（アニメ・ドラマ = D-a / 映画 = D-m） */
export default function WorkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkGate id={id} title="作品詳細">{(work) => <Detail work={work} />}</WorkGate>;
}

function Detail({ work }: { work: Work }) {
  const router = useRouter();
  const records = useRecords(work.id);
  return (
    <Screen>
      <Header
        title="作品詳細"
        left={{ label: "‹ 作品", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) }}
        right={{ label: "編集", onPress: () => router.push({ pathname: "/works/[id]/edit", params: { id: work.id } }) }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          {work.coverUrl ? (
            <Image source={work.coverUrl} style={styles.thumb} contentFit="cover" accessibilityLabel={`${work.title}の画像`} />
          ) : (
            <View style={styles.thumb} />
          )}
          <View style={{ flex: 1, gap: 2 }}>
            <Text style={styles.title}>{work.title}</Text>
            <Text style={styles.sub}>
              {WORK_TYPE_LABEL[work.type]}
              {hasSeasons(work.type) ? ` · ${work.seasons.length}シーズン` : ""}
            </Text>
          </View>
        </View>

        {hasSeasons(work.type) ? (
          <>
            <SectionTitle>作品全体の評価</SectionTitle>
            <SeriesRatingEditor work={work} />
            <SectionTitle>シーズン</SectionTitle>
            {work.seasons.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/seasons/[id]", params: { id: s.id } })}
                style={({ pressed }) => [styles.season, pressed && { opacity: 0.7 }]}
              >
                <View style={styles.seasonHead}>
                  <Text style={styles.seasonName}>{s.name}</Text>
                  <StarDisplay rating={s.rating} size={text.caption} />
                </View>
                <Text style={styles.sub}>
                  {WATCH_STATUS_LABEL[s.status]} · {s.episodeCount > 0 ? `全${s.episodeCount}話` : "話数未入力"}
                </Text>
              </Pressable>
            ))}
            <Button
              label="＋ シーズンを追加"
              variant="secondary"
              small
              onPress={() => router.push({ pathname: "/works/[id]/seasons/new", params: { id: work.id } })}
            />
          </>
        ) : (
          <>
            {/* 映画にシーズン欄は出さない（基準23） */}
            <SectionTitle>感想・評価</SectionTitle>
            <ReviewSummary
              status={work.status ?? DEFAULT_WATCH_STATUS}
              rating={work.rating}
              watchedOn={work.watchedOn}
              review={work.review}
              onEdit={() => router.push({ pathname: "/works/[id]/review", params: { id: work.id } })}
            />
          </>
        )}

        <SectionTitle>写真付き記録</SectionTitle>
        {records.isPending ? <Text style={styles.sub}>読み込み中…</Text> : null}
        {records.isError && !records.data ? (
          <>
            <Banner tone="error">{toAppError(records.error, "記録を読み込めませんでした").message}</Banner>
            <Button label="再試行" variant="secondary" small onPress={() => records.refetch()} />
          </>
        ) : null}
        {records.data?.length === 0 ? <Text style={styles.sub}>まだ記録がありません</Text> : null}
        {records.data?.map((record) => (
          <RecordCard
            key={record.id}
            record={record}
            onPress={() => router.push({ pathname: "/records/[id]", params: { id: record.id } })}
          />
        ))}
        <View style={styles.recordActions}>
          {RECORD_KINDS.map((kind) => (
            <Button
              key={kind}
              label={`＋ ${RECORD_KIND_LABEL[kind]}`}
              variant="secondary"
              small
              onPress={() => router.push({ pathname: "/records/new", params: { workId: work.id, kind } })}
            />
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  head: { flexDirection: "row", gap: spacing.md, alignItems: "center" },
  thumb: { width: 52, height: 70, borderRadius: radius.sm, backgroundColor: color.brandSoft },
  title: { fontSize: text.title, fontWeight: "700", color: color.ink },
  sub: { fontSize: text.caption, color: color.muted },
  season: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    gap: 2,
  },
  seasonHead: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  seasonName: { fontSize: text.body, fontWeight: "700", color: color.ink },
  recordActions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
});
