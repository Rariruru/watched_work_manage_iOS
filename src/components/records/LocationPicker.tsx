import { useCallback, useEffect, useRef, useState } from "react";
import { Linking, Platform, StyleSheet, View } from "react-native";
import * as Location from "expo-location";
import MapView, { Marker, type MapPressEvent } from "react-native-maps";
import { Banner, Button } from "@/components/common/ui";
import { radius, spacing } from "@/theme/tokens";

type LocationValue = { latitude: number; longitude: number } | null;

type GeocodeState = "idle" | "searching" | "found" | "not-found" | "error";

export function LocationPicker(props: {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  disabled?: boolean;
  autoGeocode?: boolean;
  searchText?: string;
}) {
  const { autoGeocode, disabled, onChange, searchText, value } = props;
  const mapRef = useRef<MapView>(null);
  const lastSearchedName = useRef(searchText?.trim() ?? "");
  const geocodeVersion = useRef(0);
  const geocodeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentLocationError, setCurrentLocationError] = useState(false);
  const [geocodeState, setGeocodeState] = useState<GeocodeState>("idle");

  const cancelGeocode = useCallback(() => {
    geocodeVersion.current += 1;
    if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
    geocodeTimer.current = null;
    setGeocodeState("idle");
  }, []);

  const geocode = useCallback(async (placeName: string, version: number) => {
    try {
      if (Platform.OS === "android") {
        const permission = await Location.requestForegroundPermissionsAsync();
        if (!permission.granted) {
          if (version === geocodeVersion.current) {
            setPermissionDenied(true);
            setGeocodeState("error");
          }
          return;
        }
        setPermissionDenied(false);
      }
      const [match] = await Location.geocodeAsync(placeName);
      if (version !== geocodeVersion.current) return;
      if (!match) {
        setGeocodeState("not-found");
        return;
      }
      onChange({ latitude: match.latitude, longitude: match.longitude });
      setGeocodeState("found");
    } catch (cause) {
      if (version !== geocodeVersion.current) return;
      console.warn("[records] 場所名から位置を検索できなかった", placeName, cause);
      setGeocodeState("error");
    }
  }, [onChange]);

  useEffect(() => {
    if (!value) return;
    mapRef.current?.animateToRegion({
      ...value,
      latitudeDelta: 0.08,
      longitudeDelta: 0.08,
    });
  }, [value]);

  useEffect(() => {
    const placeName = searchText?.trim() ?? "";
    if (!autoGeocode || disabled || placeName === "" || placeName === lastSearchedName.current) return;

    const version = ++geocodeVersion.current;
    setGeocodeState("searching");
    geocodeTimer.current = setTimeout(async () => {
      geocodeTimer.current = null;
      lastSearchedName.current = placeName;
      await geocode(placeName, version);
    }, 900);
    return () => {
      if (geocodeTimer.current) clearTimeout(geocodeTimer.current);
      geocodeTimer.current = null;
      if (geocodeVersion.current === version) geocodeVersion.current += 1;
    };
  }, [autoGeocode, disabled, geocode, searchText]);

  function retryGeocode() {
    const placeName = searchText?.trim() ?? "";
    if (placeName === "") return;
    const version = ++geocodeVersion.current;
    setGeocodeState("searching");
    void geocode(placeName, version);
  }

  async function useCurrent() {
    cancelGeocode();
    setCurrentLocationError(false);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setPermissionDenied(true);
        return;
      }
      setPermissionDenied(false);
      const current = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      onChange({ latitude: current.coords.latitude, longitude: current.coords.longitude });
    } catch (cause) {
      console.warn("[records] 現在地を取得できなかった", cause);
      setCurrentLocationError(true);
    }
  }

  function select(event: MapPressEvent) {
    cancelGeocode();
    onChange(event.nativeEvent.coordinate);
  }

  function clearLocation() {
    cancelGeocode();
    onChange(null);
  }

  const center = value ?? { latitude: 35.681236, longitude: 139.767125 };
  return (
    <View style={styles.root}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={{ ...center, latitudeDelta: 0.08, longitudeDelta: 0.08 }}
        onPress={select}
        scrollEnabled={!disabled}
      >
        {value ? <Marker coordinate={value} /> : null}
      </MapView>
      <View style={styles.actions}>
        <Button label="現在地を使う" variant="secondary" small onPress={useCurrent} disabled={disabled} />
        {value ? <Button label="位置を外す" variant="secondary" small onPress={clearLocation} disabled={disabled} /> : null}
      </View>
      {permissionDenied ? (
        <View style={styles.permission}>
          <Banner tone="warn">位置情報の許可がなくても、地図をタップして位置を選べます。</Banner>
          <Button label="設定を開く" variant="secondary" small onPress={() => Linking.openSettings()} />
        </View>
      ) : null}
      {geocodeState === "searching" ? <Banner tone="info">場所名から位置を検索しています…</Banner> : null}
      {geocodeState === "found" ? <Banner tone="info">場所名から位置を設定しました。地図タップで修正できます。</Banner> : null}
      {geocodeState === "not-found" ? <Banner tone="warn">場所が見つかりませんでした。地図をタップして選べます。</Banner> : null}
      {geocodeState === "error" ? <Banner tone="error">場所名から位置を検索できませんでした。地図をタップして選べます。</Banner> : null}
      {geocodeState === "not-found" || geocodeState === "error" ? (
        <Button label="もう一度検索" variant="secondary" small onPress={retryGeocode} disabled={disabled} />
      ) : null}
      {currentLocationError ? <Banner tone="error">現在地を取得できませんでした。地図をタップして選べます。</Banner> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { gap: spacing.sm },
  map: { height: 220, borderRadius: radius.md },
  actions: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  permission: { gap: spacing.sm },
});
