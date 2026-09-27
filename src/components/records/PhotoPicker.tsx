import { useState } from "react";
import { Linking, Pressable, StyleSheet, Text, View } from "react-native";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import type { PhotoDraft } from "@/api/records";
import { newPhotoDraft } from "@/api/records";
import { canAddPhoto, MAX_RECORD_PHOTOS } from "@/domain/records";
import { Banner, Button } from "@/components/common/ui";
import { color, radius, spacing, text } from "@/theme/tokens";

export function RecordPhotoPicker(props: {
  photos: PhotoDraft[];
  onChange: (photos: PhotoDraft[]) => void;
  disabled?: boolean;
  onRetry?: () => void;
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
        allowsMultipleSelection: true,
        selectionLimit: MAX_RECORD_PHOTOS - props.photos.length,
        quality: 1,
        exif: false,
      });
      if (result.canceled) return;

      const next = [...props.photos];
      for (const asset of result.assets) {
        // iOSでは通常fileSizeが返るが、未取得の画像を上限確認なしで通さない。
        const fileSize = asset.fileSize ?? await fetch(asset.uri).then((response) => response.blob()).then((blob) => blob.size);
        if (typeof fileSize !== "number") {
          setError("写真のサイズを確認できませんでした");
          continue;
        }
        const validation = canAddPhoto(next.length, fileSize);
        if (validation) {
          setError(validation);
          continue;
        }
        next.push(newPhotoDraft({ ...asset, fileSize }));
      }
      props.onChange(next);
    } catch (cause) {
      console.warn("[records] 写真を選択できなかった", cause);
      setError("写真を読み込めませんでした");
    }
  }

  return (
    <View style={styles.root}>
      <View style={styles.grid}>
        {props.photos.map((photo) => (
          <View key={photo.id} style={[styles.photoWrap, photo.failed && styles.failed]}>
            {photo.previewUri ? <Image source={photo.previewUri} style={styles.photo} contentFit="cover" /> : <View style={styles.photo} />}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="写真を外す"
              onPress={() => props.onChange(props.photos.filter((item) => item.id !== photo.id))}
              style={styles.remove}
              disabled={props.disabled}
            >
              <Text style={styles.removeLabel}>×</Text>
            </Pressable>
            {photo.failed ? <Text style={styles.failedLabel}>失敗</Text> : null}
          </View>
        ))}
      </View>
      {props.photos.length < MAX_RECORD_PHOTOS ? (
        <Button label="写真を選ぶ" variant="secondary" small onPress={pick} disabled={props.disabled} />
      ) : null}
      {props.photos.some((photo) => photo.failed) && props.onRetry ? (
        <Button label="失敗した写真を再試行" variant="secondary" small onPress={props.onRetry} disabled={props.disabled} />
      ) : null}
      {error ? <Banner tone="error">{error}</Banner> : null}
      {permissionDenied ? (
        <View style={styles.permission}>
          <Banner tone="warn">写真の許可がなくても、写真なしで記録できます。</Banner>
          <Button label="設定を開く" variant="secondary" small onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  photoWrap: { width: 76, height: 76, borderRadius: radius.sm, overflow: "hidden", backgroundColor: color.panel },
  photo: { width: "100%", height: "100%", backgroundColor: color.panel },
  failed: { borderWidth: 2, borderColor: color.danger },
  failedLabel: { position: "absolute", left: 4, bottom: 4, color: color.onBrand, backgroundColor: color.danger, fontSize: text.caption },
  remove: { position: "absolute", right: 2, top: 2, width: 26, height: 26, borderRadius: radius.pill, backgroundColor: color.backdrop, alignItems: "center", justifyContent: "center" },
  removeLabel: { color: color.onBrand, fontSize: text.title, fontWeight: "700" },
  permission: { gap: spacing.sm },
});
