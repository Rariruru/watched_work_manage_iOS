import { Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import type { WorkRecord } from "@/domain/types";
import { RECORD_KIND_LABEL } from "@/domain/labels";
import { color, radius, spacing, text } from "@/theme/tokens";

export function RecordCard(props: { record: WorkRecord; onPress: () => void }) {
  const cover = props.record.photos[0]?.url;
  return (
    <Pressable onPress={props.onPress} style={({ pressed }) => [styles.card, pressed && { opacity: 0.7 }]}>
      {cover ? <Image source={cover} style={styles.image} contentFit="cover" /> : <View style={styles.placeholder} />}
      <View style={styles.body}>
        <Text style={styles.kind}>{RECORD_KIND_LABEL[props.record.kind]}</Text>
        <Text style={styles.name} numberOfLines={2}>{props.record.name}</Text>
        <Text style={styles.meta}>{props.record.occurredOn ?? "日付なし"} · 写真{props.record.photos.length}枚</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: "row", gap: spacing.md, padding: spacing.md, borderWidth: 1, borderColor: color.line, borderRadius: radius.md, backgroundColor: color.surface },
  image: { width: 68, height: 68, borderRadius: radius.sm },
  placeholder: { width: 68, height: 68, borderRadius: radius.sm, backgroundColor: color.brandSoft },
  body: { flex: 1, gap: 2, justifyContent: "center" },
  kind: { color: color.brand, fontSize: text.caption, fontWeight: "700" },
  name: { color: color.ink, fontSize: text.body, fontWeight: "700" },
  meta: { color: color.muted, fontSize: text.caption },
});
