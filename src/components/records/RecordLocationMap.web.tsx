import { StyleSheet, Text, View } from "react-native";
import { color, radius, spacing, text } from "@/theme/tokens";

export function RecordLocationMap(props: { latitude: number; longitude: number }) {
  return (
    <View style={styles.map}>
      <Text style={styles.label}>保存した位置</Text>
      <Text style={styles.coordinate}>{props.latitude.toFixed(6)}, {props.longitude.toFixed(6)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  map: { minHeight: 120, borderRadius: radius.md, backgroundColor: color.panel, padding: spacing.lg, justifyContent: "center", alignItems: "center", gap: spacing.xs },
  label: { color: color.brand, fontSize: text.label, fontWeight: "700" },
  coordinate: { color: color.muted, fontSize: text.caption },
});
