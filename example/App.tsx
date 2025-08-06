import * as ExpoMusicLibrary from "expo-music-library";
import { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  FlatList,
  ActivityIndicator,
  Button,
  Linking,
  Platform,
  Alert,
  Image,
  ScrollView,
  SafeAreaView,
} from "react-native";

export default function App() {
  const [assets, setAssets] = useState<ExpoMusicLibrary.Asset[]>([]);
  const [albums, setAlbums] = useState<ExpoMusicLibrary.Album[]>([]);
  const [artists, setArtists] = useState<ExpoMusicLibrary.Artist[]>([]);
  const [playlists, setPlaylists] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [currentView, setCurrentView] = useState<
    "assets" | "albums" | "artists" | "playlists"
  >("assets");

  useEffect(() => {
    loadMusicLibrary();
  }, []);

  const loadMusicLibrary = async () => {
    try {
      setLoading(true);
      setError(null);

      // Check if library is available
      const isAvailable = await ExpoMusicLibrary.isAvailableAsync();
      if (!isAvailable) {
        setError("Music Library is not available on this device");
        setLoading(false);
        return;
      }

      // Request permissions
      console.log("Requesting permissions...");
      const permissions = await ExpoMusicLibrary.requestPermissionsAsync();
      console.log("Permission response:", permissions);

      if (!permissions.granted) {
        if (permissions.canAskAgain) {
          setError("Permission to access music library is required.");
        } else {
          setPermissionDenied(true);
        }
        setLoading(false);
        return;
      }

      // Load music data
      console.log("Loading music assets...");
      const assetsResult = await ExpoMusicLibrary.getAssetsAsync({ first: 20 });
      console.log("Assets result:", assetsResult);

      if (assetsResult && assetsResult.assets) {
        setAssets(assetsResult.assets);
      } else {
        console.warn("No assets returned or invalid format");
      }

      // Load albums
      try {
        console.log("Loading albums...");
        const albumsResult = await ExpoMusicLibrary.getAlbumsAsync();
        console.log("Albums result:", albumsResult);
        setAlbums(albumsResult || []);
      } catch (albumError) {
        console.warn("Failed to load albums:", albumError);
      }

      // Load artists
      try {
        console.log("Loading artists...");
        const artistsResult = await ExpoMusicLibrary.getArtistsAsync();
        console.log("Artists result:", artistsResult);
        setArtists(artistsResult || []);
      } catch (artistError) {
        console.warn("Failed to load artists:", artistError);
      }

      // Load playlists (if getFoldersAsync is still available)
      try {
        console.log("Loading playlists/folders...");
        if (ExpoMusicLibrary.getFoldersAsync) {
          const foldersResults = await ExpoMusicLibrary.getFoldersAsync();
          console.log("Playlists result:", foldersResults);
          setPlaylists(foldersResults || []);
        }
      } catch (playlistError) {
        console.warn("Failed to load playlists:", playlistError);
      }

      setLoading(false);
    } catch (err) {
      console.error("Error loading music library:", err);
      setError(`Failed to fetch music data: ${err.message || err}`);
      setLoading(false);
    }
  };

  const openSettings = () => {
    Alert.alert(
      "Permissions Required",
      "Please enable Music Library access in Settings",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Open Settings",
          onPress: () => {
            if (Platform.OS === "ios") {
              Linking.openURL("app-settings:");
            } else {
              Linking.openSettings();
            }
          },
        },
      ]
    );
  };

  const renderAssetItem = ({ item }: { item: ExpoMusicLibrary.Asset }) => {
    const artworkUri =
      Platform.OS === "android"
        ? item.artwork // Already a file URI on Android
        : `data:image/jpeg;base64,${item.artwork}`; // Base64 on iOS

    return (
      <View style={styles.item}>
        <View style={styles.itemContent}>
          {item.artwork ? (
            <Image
              source={{ uri: artworkUri }}
              style={styles.artwork}
              onError={() =>
                console.log("Failed to load artwork for:", item.title)
              }
            />
          ) : (
            <View style={styles.noArtwork}>
              <Text style={styles.noArtworkText}>♪</Text>
            </View>
          )}
          <View style={styles.itemDetails}>
            <Text style={styles.title} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.artist} numberOfLines={1}>
              {item.artist}
            </Text>
            <Text style={styles.duration}>{formatDuration(item.duration)}</Text>
            <Text style={styles.id}>ID: {item.id}</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderAlbumItem = ({ item }: { item: ExpoMusicLibrary.Album }) => {
    const artworkUri =
      Platform.OS === "android"
        ? item.artwork // Already a file URI on Android
        : `data:image/jpeg;base64,${item.artwork}`; // Base64 on iOS
    return (
      <View style={styles.item}>
        <View style={styles.itemContent}>
          {item.artwork ? (
            <Image source={{ uri: artworkUri }} style={styles.artwork} />
          ) : (
            <View style={styles.noArtwork}>
              <Text style={styles.noArtworkText}>♪</Text>
            </View>
          )}
          <View style={styles.itemDetails}>
            <Text style={styles.title}>{item.title}</Text>
            <Text style={styles.artist}>{item.artist}</Text>
            <Text style={styles.count}>{item.assetCount} songs</Text>
          </View>
        </View>
      </View>
    );
  };

  const renderArtistItem = ({ item }: { item: ExpoMusicLibrary.Artist }) => (
    <View style={styles.item}>
      <View style={styles.itemDetails}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.count}>{item.assetCount} songs</Text>
      </View>
    </View>
  );

  const formatDuration = (duration: number) => {
    const minutes = Math.floor(duration / 60);
    const seconds = Math.floor(duration % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text style={styles.loadingText}>Loading Music Library...</Text>
      </SafeAreaView>
    );
  }

  if (permissionDenied) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>
          Permission to access music library is required.
        </Text>
        <Button title="Open Settings" onPress={openSettings} />
        <Button title="Retry" onPress={loadMusicLibrary} />
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.errorText}>{error}</Text>
        <Button title="Retry" onPress={loadMusicLibrary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Music Library Test</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabContainer}
        >
          <Button
            title={`Songs (${assets.length})`}
            onPress={() => setCurrentView("assets")}
            color={currentView === "assets" ? "#007AFF" : "#666"}
          />
          <Button
            title={`Albums (${albums.length})`}
            onPress={() => setCurrentView("albums")}
            color={currentView === "albums" ? "#007AFF" : "#666"}
          />
          <Button
            title={`Artists (${artists.length})`}
            onPress={() => setCurrentView("artists")}
            color={currentView === "artists" ? "#007AFF" : "#666"}
          />
          <Button
            title={`Playlists (${playlists.length})`}
            onPress={() => setCurrentView("playlists")}
            color={currentView === "playlists" ? "#007AFF" : "#666"}
          />
        </ScrollView>
      </View>

      <View style={styles.content}>
        {currentView === "assets" && (
          <FlatList
            data={assets}
            keyExtractor={(item) => item.id}
            renderItem={renderAssetItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No songs found</Text>
            }
          />
        )}
        {currentView === "albums" && (
          <FlatList
            data={albums}
            keyExtractor={(item) => item.id}
            renderItem={renderAlbumItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No albums found</Text>
            }
          />
        )}
        {currentView === "artists" && (
          <FlatList
            data={artists}
            keyExtractor={(item) => item.id}
            renderItem={renderArtistItem}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No artists found</Text>
            }
          />
        )}
        {currentView === "playlists" && (
          <FlatList
            data={playlists}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.item}>
                <Text style={styles.title}>{item.title}</Text>
              </View>
            )}
            ListEmptyComponent={
              <Text style={styles.emptyText}>No playlists found</Text>
            }
          />
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    backgroundColor: "#f8f8f8",
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 10,
  },
  tabContainer: {
    paddingHorizontal: 10,
  },
  content: {
    flex: 1,
  },
  errorText: {
    color: "red",
    fontSize: 18,
    paddingHorizontal: 20,
    textAlign: "center",
    marginBottom: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  item: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  itemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  itemDetails: {
    flex: 1,
    marginLeft: 15,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 5,
  },
  noArtwork: {
    width: 50,
    height: 50,
    borderRadius: 5,
    backgroundColor: "#f0f0f0",
    alignItems: "center",
    justifyContent: "center",
  },
  noArtworkText: {
    fontSize: 20,
    color: "#999",
  },
  title: {
    fontSize: 16,
    fontWeight: "500",
    marginBottom: 2,
  },
  artist: {
    fontSize: 14,
    color: "#666",
    marginBottom: 2,
  },
  duration: {
    fontSize: 12,
    color: "#999",
  },
  count: {
    fontSize: 12,
    color: "#999",
  },
  id: {
    fontSize: 10,
    color: "#ccc",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 50,
    fontSize: 16,
    color: "#999",
  },
});
