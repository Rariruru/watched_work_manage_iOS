import { ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { RECORD_KIND_LABEL } from "@/domain/labels";
import { RECORD_KINDS } from "@/domain/types";
import { Button, Header, Screen } from "@/components/common/ui";
import { color, spacing, text } from "@/theme/tokens";

export default function AddMenu() {
  const router = useRouter();
  return (
    <Screen>
      <Header title="追加" left={{ label: "閉じる", onPress: () => router.back() }} />
      <ScrollView contentContainerStyle={styles.body}>
        <Text style={styles.help}>追加するものを選んでください</Text>
        <Button label="作品を追加" onPress={() => router.push("/works/new")} />
        {RECORD_KINDS.map((kind) => (
          <Button
            key={kind}
            label={`${RECORD_KIND_LABEL[kind]}を記録`}
            variant="secondary"
            onPress={() => router.push({ pathname: "/records/new", params: { kind } })}
          />
        ))}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  body: { padding: spacing.lg, gap: spacing.md },
  help: { color: color.muted, fontSize: text.label },
});
