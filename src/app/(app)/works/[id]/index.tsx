import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { WATCH_STATUS_LABEL, WORK_TYPE_LABEL } from "@/domain/labels";
import { hasSeasons } from "@/domain/works";
import type { Work } from "@/domain/types";
import { Button, Header, Screen, SectionTitle } from "@/components/common/ui";
import { WorkGate } from "@/components/works/WorkGate";
import { color, radius, spacing, text } from "@/theme/tokens";

/** D 作品詳細（アニメ・ドラマ = D-a / 映画 = D-m） */
export default function WorkDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <WorkGate id={id} title="作品詳細">{(work) => <Detail work={work} />}</WorkGate>;
}

function Detail({ work }: { work: Work }) {
  const router = useRouter();
  return (
    <Screen>
      <Header
        title="作品詳細"
        left={{ label: "‹ 作品", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) }}
        right={{ label: "編集", onPress: () => router.push({ pathname: "/works/[id]/edit", params: { id: work.id } }) }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <View style={styles.head}>
          <View style={styles.thumb} />
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
            <SectionTitle>シーズン</SectionTitle>
            {work.seasons.map((s) => (
              <Pressable
                key={s.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: "/seasons/[id]", params: { id: s.id } })}
                style={({ pressed }) => [styles.season, pressed && { opacity: 0.7 }]}
              >
                <Text style={styles.seasonName}>{s.name}</Text>
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
            {/* 映画にシーズン欄は出さない（基準23）。評価・感想は次の範囲で足す */}
            <SectionTitle>視聴状態</SectionTitle>
            <Text style={styles.value}>{work.status ? WATCH_STATUS_LABEL[work.status] : "未設定"}</Text>
          </>
        )}
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
  value: { fontSize: text.body, color: color.ink },
  season: {
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: color.line,
    backgroundColor: color.surface,
    gap: 2,
  },
  seasonName: { fontSize: text.body, fontWeight: "700", color: color.ink },
});
