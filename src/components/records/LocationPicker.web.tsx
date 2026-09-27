import { StyleSheet, View } from "react-native";
import { Field, Input } from "@/components/common/ui";
import { spacing } from "@/theme/tokens";

type LocationValue = { latitude: number; longitude: number } | null;

function numberOrNull(value: string): number | null {
  if (value.trim() === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function LocationPicker(props: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  autoGeocode?: boolean;
  searchText?: string;
}) {
  return (
    <View style={styles.row}>
      <Field label="緯度">
        <Input
          value={props.value?.latitude?.toString() ?? ""}
          onChangeText={(text) => {
            const latitude = numberOrNull(text);
            const longitude = props.value?.longitude ?? null;
            props.onChange(latitude === null && longitude === null ? null : { latitude: latitude ?? 0, longitude: longitude ?? 0 });
          }}
          editable={!props.disabled}
          keyboardType="decimal-pad"
        />
      </Field>
      <Field label="経度">
        <Input
          value={props.value?.longitude?.toString() ?? ""}
          onChangeText={(text) => {
            const longitude = numberOrNull(text);
            const latitude = props.value?.latitude ?? null;
            props.onChange(latitude === null && longitude === null ? null : { latitude: latitude ?? 0, longitude: longitude ?? 0 });
          }}
          editable={!props.disabled}
          keyboardType="decimal-pad"
        />
      </Field>
    </View>
  );
}

const styles = StyleSheet.create({ row: { gap: spacing.sm } });
