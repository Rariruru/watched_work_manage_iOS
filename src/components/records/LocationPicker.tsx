import { useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
import { Banner, Button } from "@/components/common/ui";
import { radius, spacing } from "@/theme/tokens";

type LocationValue = { latitude: number; longitude: number } | null;

export function LocationPicker(props: { value: LocationValue; onChange: (value: LocationValue) => void; disabled?: boolean }) {
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState(false);

  async function useCurrent() {
    setError(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      props.onChange({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (cause) {
      console.warn("[records] 現在地を取得できなかった", cause);
      setError(true);
    }
  }

  function select(event: MapPressEvent) {
    props.onChange(event.nativeEvent.coordinate);
  }

  const center = props.value ?? { latitude: 35.681236, longitude: 139.767125 };
  return (
    <View style={styles.root}>
      <MapView
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onPress={select}
        scrollEnabled={!props.disabled}
      >
        {props.value ? <Marker coordinate={props.value} /> : null}
      </MapView>
      <View style={styles.actions}>
        <Button label="現在地を使う" variant="secondary" small onPress={useCurrent} disabled={props.disabled} />
        {props.value ? <Button label="位置を外す" variant="secondary" small onPress={() => props.onChange(null)} disabled={props.disabled} /> : null}
      </View>
      {permissionDenied ? (
        <View style={styles.permission}>
          <Banner tone="warn">位置情報の許可がなくても、地図をタップして位置を選べます。</Banner>
          <Button label="設定を開く" variant="secondary" small onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
      {error ? <Banner tone="error">現在地を取得できませんでした。地図をタップして選べます。</Banner> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  map: { height: 220, borderRadius: radius.md },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  permission: { gap: spacing.sm },
});
