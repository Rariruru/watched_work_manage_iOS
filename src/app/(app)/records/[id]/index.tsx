import { ScrollView, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, useRouter } from "expo-router";
import { RECORD_KIND_LABEL } from "@/domain/labels";
import type { Work, WorkRecord } from "@/domain/types";
import { RecordGate } from "@/components/records/RecordGate";
import { RecordLocationMap } from "@/components/records/RecordLocationMap";
import { Header, Screen, SectionTitle } from "@/components/common/ui";
import { color, radius, spacing, text } from "@/theme/tokens";

export default function RecordDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <RecordGate id={id} title="記録詳細">{(record, work) => <Detail record={record} work={work} />}</RecordGate>;
}

function Detail({ record, work }: { record: WorkRecord; work: Work }) {
  const router = useRouter();
  return (
    <Screen>
      <Header
        title={RECORD_KIND_LABEL[record.kind]}
        left={{ label: "‹ 戻る", onPress: () => (router.canGoBack() ? router.back() : router.replace("/")) }}
        right={{ label: "編集", onPress: () => router.push({ pathname: "/records/[id]/edit", params: { id: record.id } }) }}
      />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.name}>{record.name}</Text>
        <Text style={styles.work}>{work.title}</Text>
        <Text style={styles.date}>{record.occurredOn ?? "日付なし"}</Text>
        {record.photos.length ? (
          <View style={styles.photos}>
            {record.photos.map((photo) => photo.url ? <Image key={photo.id} source={photo.url} style={styles.photo} contentFit="cover" /> : <View key={photo.id} style={styles.photo} />)}
          </View>
        ) : null}
        {record.latitude !== null && record.longitude !== null ? (
          <>
            <SectionTitle>位置</SectionTitle>
            <RecordLocationMap latitude={record.latitude} longitude={record.longitude} />
          </>
        ) : null}
        {record.memo ? (
          <>
            <SectionTitle>メモ</SectionTitle>
            <Text style={styles.text}>{record.memo}</Text>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  name: { color: color.ink, fontSize: text.heading, fontWeight: "700" },
  work: { color: color.brand, fontSize: text.body, fontWeight: "700" },
  date: { color: color.muted, fontSize: text.label },
  photos: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  photo: { width: "48%", aspectRatio: 1, borderRadius: radius.md, backgroundColor: color.panel },
  text: { color: color.ink, fontSize: text.body, lineHeight: 23 },
});
