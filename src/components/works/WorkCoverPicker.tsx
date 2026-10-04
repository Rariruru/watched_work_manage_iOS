import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import type { WorkCoverDraft } from "@/api/works";
import { MAX_PHOTO_BYTES } from "@/domain/records";
import { Banner, Button } from "@/components/common/ui";
import { color, radius, spacing, text } from "@/theme/tokens";

export function WorkCoverPicker(props: {
  cover: WorkCoverDraft | null;
  onChange: (cover: WorkCoverDraft | null) => void;
  disabled?: boolean;
}) {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function pick() {
    setError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [2, 3],
        quality: 1,
        exif: false,
      });
      if (result.canceled) return;
      const asset = result.assets[0];
      const fileSize =
        asset.fileSize ??
        (await fetch(asset.uri)
          .then((response) => response.blob())
          .then((blob) => blob.size));
      if (typeof fileSize !== "number") {
        setError("画像のサイズを確認できませんでした");
        return;
      }
      if (fileSize > MAX_PHOTO_BYTES) {
        setError("画像は10MB以下を選んでください");
        return;
      }
      props.onChange({
        previewUri: asset.uri,
        localUri: asset.uri,
        storagePath: null,
        width: asset.width,
        height: asset.height,
        fileSize,
      });
    } catch (cause) {
      console.warn("[works] 作品画像を選択できなかった", cause);
      setError("作品画像を読み込めませんでした");
    }
  }

  return (
    <View style={styles.root}>
      {props.cover ? (
        <View style={styles.previewWrap}>
          {props.cover.previewUri ? (
            <Image source={props.cover.previewUri} style={styles.preview} contentFit="cover" />
          ) : (
            <View style={styles.preview} />
          )}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="作品画像を外す"
            onPress={() => props.onChange(null)}
            disabled={props.disabled}
            style={styles.remove}
          >
            <Text style={styles.removeLabel}>×</Text>
          </Pressable>
        </View>
      ) : null}
      <Button
        label={props.cover ? "画像を変更" : "作品画像を選ぶ"}
        variant="secondary"
        small
        onPress={pick}
        disabled={props.disabled}
      />
      {error ? <Banner tone="error">{error}</Banner> : null}
      {permissionDenied ? (
        <View style={styles.permission}>
          <Banner tone="warn">写真の許可がなくても、作品画像なしで保存できます。</Banner>
          <Button label="設定を開く" variant="secondary" small onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { alignItems: "flex-start", gap: spacing.sm },
  previewWrap: {
    width: 112,
    height: 168,
    borderRadius: radius.md,
    overflow: "hidden",
    backgroundColor: color.panel,
  },
  preview: { width: "100%", height: "100%", backgroundColor: color.panel },
  remove: {
    position: "absolute",
    right: 4,
    top: 4,
    width: 30,
    height: 30,
    borderRadius: radius.pill,
    backgroundColor: color.backdrop,
    alignItems: "center",
    justifyContent: "center",
  },
  removeLabel: { color: color.onBrand, fontSize: text.title, fontWeight: "700" },
  permission: { alignSelf: "stretch", gap: spacing.sm },
});
