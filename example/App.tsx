import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Button,
  Linking,
  Platform,
} from "react-native";
import * as ExpoMusicLibrary from "expo-music-library";
import { useEffect, useState } from "react";

export default function App() {
  const [assets, setAssets] = useState<ExpoMusicLibrary.Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        let permissions = await ExpoMusicLibrary.requestPermissionsAsync();
        if (!permissions.granted) {
          if (permissions.canAskAgain) {
            setError("Permission to access music library is required.");
          } else {
            setPermissionDenied(true);
          }
          setLoading(false);
          return;
        }

        const assets = await ExpoMusicLibrary.getAssetsAsync();
        const results = await ExpoMusicLibrary.getFoldersAsync();
        const artists = await ExpoMusicLibrary.getArtistsAsync();

        console.log("assets", assets);
        console.log("folders", results);
        console.log("artists", artists);
        setLoading(false);
      } catch (err) {
        console.log(err);
        setError("Failed to fetch music assets.");
        setLoading(false);
      }
    })();
  }, []);

  const openSettings = () => {
    if (Platform.OS === "ios") {
      Linking.openURL("app-settings:");
    } else {
      Linking.openSettings();
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
      </View>
    );
  }

  if (permissionDenied) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          Permission to access music library is required.
        </Text>
        <Button title="Open Settings" onPress={openSettings} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={assets}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item }) => (
          <View style={styles.item}>
            <Text>{item.id}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    color: "red",
    fontSize: 18,
    paddingHorizontal: 5,
  },
  item: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ccc",
    width: "100%",
  },
});
