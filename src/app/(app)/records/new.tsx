import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useWorks } from "@/api/queries";
import { toAppError } from "@/api/errors";
import { RECORD_KIND_LABEL, WORK_TYPE_LABEL } from "@/domain/labels";
import { RECORD_KINDS } from "@/domain/types";
import type { RecordKind } from "@/domain/types";
import { RecordEditor } from "@/components/records/RecordEditor";
import { Button, Header, Screen, StateView } from "@/components/common/ui";
import { color, radius, spacing, text } from "@/theme/tokens";

function isRecordKind(value: string | undefined): value is RecordKind {
  return RECORD_KINDS.some((kind) => kind === value);
}

export default function NewRecord() {
  const params = useLocalSearchParams<{ kind?: string; workId?: string }>();
  const router = useRouter();
  const works = useWorks();
  const kind: RecordKind = isRecordKind(params.kind) ? params.kind : "pilgrimage";

  if (works.isError && !works.data) {
    return <Screen><Header title={`${RECORD_KIND_LABEL[kind]}を記録`} left={{ label: "‹ 戻る", onPress: () => router.back() }} /><StateView title="読み込めませんでした" message={toAppError(works.error, "作品を読み込めませんでした").message} action={{ label: "再試行", onPress: () => works.refetch() }} /></Screen>;
  }
  if (works.isPending) return <Screen><Header title={`${RECORD_KIND_LABEL[kind]}を記録`} /><StateView loading /></Screen>;

  const work = works.data.find((item) => item.id === params.workId);
  if (work) {
    return (
      <RecordEditor
        work={work}
        kind={kind}
        onCancel={() => router.back()}
        onSaved={(id) => router.replace({ pathname: "/records/[id]", params: { id } })}
      />
    );
  }

  return (
    <Screen>
      <Header title="作品を選ぶ" left={{ label: "‹ 戻る", onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.help}>{RECORD_KIND_LABEL[kind]}を紐づける作品を選んでください。</Text>
        {works.data.map((item) => (
          <Pressable
            key={item.id}
            onPress={() => router.setParams({ workId: item.id })}
            style={({ pressed }) => [styles.work, pressed && { opacity: 0.7 }]}
          >
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.meta}>{WORK_TYPE_LABEL[item.type]}</Text>
          </Pressable>
        ))}
        <View style={styles.newWork}>
          <Button
            label="新しい作品を作る"
            variant="secondary"
            onPress={() => router.push({ pathname: "/works/new", params: { returnTo: "record", recordKind: kind } })}
          />
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.sm, paddingBottom: spacing.xxl },
  help: { color: color.muted, fontSize: text.label, marginBottom: spacing.sm },
  work: { padding: spacing.md, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, backgroundColor: color.surface },
  title: { color: color.ink, fontSize: text.body, fontWeight: "700" },
  meta: { color: color.muted, fontSize: text.caption },
  newWork: { marginTop: spacing.md },
});
