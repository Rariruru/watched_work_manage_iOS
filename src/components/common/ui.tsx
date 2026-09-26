import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import type { TextInputProps, ViewStyle } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { color, HIT_SIZE, radius, spacing, text } from "@/theme/tokens";

/** 画面の外枠。背景色と安全領域 */
export function Screen({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.screen} edges={["top", "left", "right"]}>
      {children}
    </SafeAreaView>
  );
}

/** 画面上部のバー。左右は文字のボタン */
export function Header(props: {
  title: string;
  left?: { label: string; onPress: () => void };
  right?: { label: string; onPress: () => void; disabled?: boolean };
}) {
  return (
    <View style={styles.header}>
      <View style={styles.headerSide}>
        {props.left && <HeaderAction {...props.left} align="left" />}
      </View>
      <Text style={styles.headerTitle} numberOfLines={1}>
        {props.title}
      </Text>
      <View style={[styles.headerSide, { alignItems: "flex-end" }]}>
        {props.right && <HeaderAction {...props.right} align="right" />}
      </View>
    </View>
  );
}

function HeaderAction(p: { label: string; onPress: () => void; disabled?: boolean; align: "left" | "right" }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={p.onPress}
      disabled={p.disabled}
      hitSlop={8}
      style={{ minHeight: HIT_SIZE, justifyContent: "center" }}
    >
      <Text style={[styles.headerAction, p.disabled && { color: color.muted }]}>{p.label}</Text>
    </Pressable>
  );
}

export function Button(props: {
  label: string;
  onPress: () => void;
  variant?: "primary" | "secondary" | "danger";
  small?: boolean;
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
}) {
  const variant = props.variant ?? "primary";
  const disabled = props.disabled || props.loading;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.button,
        props.small && styles.buttonSmall,
        variant === "primary" && styles.buttonPrimary,
        variant === "secondary" && styles.buttonSecondary,
        variant === "danger" && styles.buttonDanger,
        (pressed || disabled) && { opacity: 0.6 },
        props.style,
      ]}
    >
      {props.loading ? (
        <ActivityIndicator color={variant === "primary" ? color.onBrand : color.brand} />
      ) : (
        <Text
          style={[
            styles.buttonLabel,
            props.small && { fontSize: text.label },
            variant === "primary" && { color: color.onBrand },
            variant === "secondary" && { color: color.brand },
            variant === "danger" && { color: color.danger },
          ]}
        >
          {props.label}
        </Text>
      )}
    </Pressable>
  );
}

export function Field(props: { label: string; error?: string | null; children: React.ReactNode }) {
  return (
    <View style={{ gap: spacing.xs }}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      {props.children}
      {props.error ? <Text style={styles.fieldError}>{props.error}</Text> : null}
    </View>
  );
}

export function Input(props: TextInputProps & { invalid?: boolean }) {
  const { invalid, style, ...rest } = props;
  return (
    <TextInput
      placeholderTextColor={color.muted}
      {...rest}
      style={[styles.input, invalid && styles.inputInvalid, style]}
    />
  );
}

/** 横並びの択一（種別・視聴状態・表示の切り替え） */
export function Segmented<T extends string>(props: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.segment}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => props.onChange(o.value)}
            style={[styles.segmentItem, on && styles.segmentOn]}
          >
            <Text style={[styles.segmentLabel, on && { color: color.onBrand }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 絞り込みの丸いボタンの列 */
export function ChipRow<T extends string>(props: {
  options: readonly { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.chips}>
      {props.options.map((o) => {
        const on = o.value === props.value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: on }}
            onPress={() => props.onChange(o.value)}
            style={[styles.chip, on && styles.chipOn]}
          >
            <Text style={[styles.chipLabel, on && { color: color.onBrand }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/** 空状態・エラー・読み込み中を画面の真ん中に出す */
export function StateView(props: {
  title?: string;
  message?: string;
  action?: { label: string; onPress: () => void };
  loading?: boolean;
}) {
  return (
    <View style={styles.state}>
      {props.loading && <ActivityIndicator color={color.brand} />}
      {props.title ? <Text style={styles.stateTitle}>{props.title}</Text> : null}
      {props.message ? <Text style={styles.stateMessage}>{props.message}</Text> : null}
      {props.action && <Button label={props.action.label} onPress={props.action.onPress} />}
    </View>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

/** 注記（青）・警告（黄）・失敗（赤）の帯 */
export function Banner(props: { tone: "info" | "warn" | "error"; children: React.ReactNode }) {
  const tone = {
    info: { bg: color.infoSoft, fg: color.info },
    warn: { bg: color.warnSoft, fg: color.warn },
    error: { bg: color.dangerSoft, fg: color.danger },
  }[props.tone];
  return (
    <View style={[styles.banner, { backgroundColor: tone.bg }]}>
      <Text style={{ color: tone.fg, fontSize: text.label, lineHeight: 19 }}>{props.children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: color.bg },
  header: {
    minHeight: HIT_SIZE + spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: color.line,
    backgroundColor: color.surface,
  },
  headerSide: { flex: 1 },
  headerTitle: { flex: 2, textAlign: "center", fontSize: text.title, fontWeight: "700", color: color.ink },
  headerAction: { fontSize: text.body, fontWeight: "700", color: color.brand },
  button: {
    minHeight: HIT_SIZE,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonSmall: { minHeight: 36, paddingHorizontal: spacing.md, alignSelf: "flex-start" },
  buttonPrimary: { backgroundColor: color.brand },
  buttonSecondary: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.line },
  buttonDanger: { backgroundColor: color.surface, borderWidth: 1, borderColor: color.danger },
  buttonLabel: { fontSize: text.body, fontWeight: "700" },
  fieldLabel: { fontSize: text.label, fontWeight: "700", color: color.ink },
  fieldError: { fontSize: text.caption, color: color.danger },
  input: {
    minHeight: HIT_SIZE,
    borderWidth: 1,
    borderColor: color.line,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: color.surface,
    fontSize: text.body,
    color: color.ink,
  },
  inputInvalid: { borderColor: color.danger, backgroundColor: color.dangerSoft },
  segment: { flexDirection: "row", borderRadius: radius.sm, overflow: "hidden", backgroundColor: color.panel },
  segmentItem: { flex: 1, minHeight: 36, alignItems: "center", justifyContent: "center" },
  segmentOn: { backgroundColor: color.brand },
  segmentLabel: { fontSize: text.label, color: color.ink, fontWeight: "700" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: spacing.xs },
  chip: {
    minHeight: 32,
    paddingHorizontal: spacing.md,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: color.line,
    justifyContent: "center",
    backgroundColor: color.surface,
  },
  chipOn: { backgroundColor: color.brand, borderColor: color.brand },
  chipLabel: { fontSize: text.label, color: color.muted },
  state: { flex: 1, alignItems: "center", justifyContent: "center", gap: spacing.md, padding: spacing.xl },
  stateTitle: { fontSize: text.title, fontWeight: "700", color: color.ink, textAlign: "center" },
  stateMessage: { fontSize: text.label, color: color.muted, textAlign: "center", lineHeight: 20 },
  sectionTitle: { fontSize: text.caption, fontWeight: "700", color: color.muted, marginTop: spacing.sm },
  banner: { borderRadius: radius.sm, padding: spacing.md },
});
