import { StyleSheet } from "react-native";
import MapView, { Marker } from "react-native-maps";
import { radius } from "@/theme/tokens";

export function RecordLocationMap(props: { latitude: number; longitude: number }) {
  const coordinate = { latitude: props.latitude, longitude: props.longitude };
  return (
    <MapView
      style={styles.map}
      initialRegion={{ ...coordinate, latitudeDelta: 0.02, longitudeDelta: 0.02 }}
      pitchEnabled={false}
      rotateEnabled={false}
    >
      <Marker coordinate={coordinate} />
    </MapView>
  );
}

const styles = StyleSheet.create({
  map: { height: 220, borderRadius: radius.md },
});
