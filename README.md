# Expo Music Library

![npm](https://img.shields.io/npm/v/expo-music-library)
![License](https://img.shields.io/npm/l/expo-music-library)
![Downloads](https://img.shields.io/npm/dm/expo-music-library)

A powerful Expo native module that provides seamless access to the device's music library, enabling you to read and retrieve audio files, albums, artists, folders, and genres in your React Native applications.

## 📱 Screenshots

### iOS Screenshots

|                       Music Library                        |                     Album View                     |                  Artist View                  |                      Permissions                      |
| :--------------------------------------------------------: | :------------------------------------------------: | :-------------------------------------------: | :---------------------------------------------------: |
| ![iOS Music Library](./screenshots/ios-music-library.png)  |    ![iOS Albums](./screenshots/ios-albums.png)     | ![iOS Artists](./screenshots/ios-artists.png) | ![iOS Permissions](./screenshots/ios-permissions.png) |
| _Main music library interface showing songs with metadata_ | _Album collection with cover art and track counts_ |    _Artist listing with album information_    |              _Permission request dialog_              |

### Android Screenshots

|                           Music Library                           |                     Album View                      |                      Artist View                      |                          Permissions                          |
| :---------------------------------------------------------------: | :-------------------------------------------------: | :---------------------------------------------------: | :-----------------------------------------------------------: |
| ![Android Music Library](./screenshots/android-music-library.png) | ![Android Albums](./screenshots/android-albums.png) | ![Android Artists](./screenshots/android-artists.png) | ![Android Permissions](./screenshots/android-permissions.png) |
|      _Material Design music interface with sorting options_       |       _Grid layout album view with cover art_       |         _Artist cards with track statistics_          |                _Android 13+ media permissions_                |

## ✨ Features

- 🎵 **Comprehensive Music Access**: Retrieve audio files, albums, artists, and genres with full metadata
- 📁 **Smart Folder Management**: Access and organize music by folders with hierarchical structure
- 🎨 **Rich Metadata Support**: Get detailed information including artwork, duration, bitrate, and more
- 📱 **Cross-Platform Excellence**: Full support for both Android and iOS with platform-specific optimizations
- 🔧 **TypeScript First**: Complete type definitions with IntelliSense support
- ⚡ **Performance Optimized**: Efficient pagination, caching, and filtering options
- 🎛️ **Advanced Filtering**: Filter by date, duration, genre, and custom criteria
- 🔄 **Real-time Updates**: Listen to music library changes (coming soon)

## 🚀 Platform Support

| Platform      | Android | iOS Device | iOS Simulator | Web | Expo Go |
| ------------- | :-----: | :--------: | :-----------: | :-: | :-----: |
| **Supported** |   ✅    |     ✅     |      ✅       | ❌  |   ❌    |

**Requirements:**

- ✅ **Expo Development Builds** (includes config plugin)
- ✅ **Expo SDK 45+** (recommended: latest version)
- ✅ **React Native 0.64+**
- ❌ **Not compatible with Expo Go** (requires custom native code)

**Minimum OS Versions:**

- **iOS**: 11.0+
- **Android**: API Level 21 (Android 5.0)+

## 📦 Installation

### Quick Start

```bash
# Using npm
npm install expo-music-library

# Using yarn
yarn add expo-music-library

# Using pnpm
pnpm add expo-music-library

# Using bun
bun add expo-music-library
```

### Development Build Setup

After installation, you'll need to rebuild your app:

```bash
# For Android
expo run:android

# For iOS
expo run:ios

# Or rebuild for both platforms
expo prebuild --clean
```

## ⚙️ Configuration

### Automatic Configuration (Recommended)

Add the plugin to your `app.json` or `app.config.js`:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-music-library",
        {
          "musicLibraryPermission": "Allow $(PRODUCT_NAME) to access your music library to play and organize your music.",
          "microphonePermission": "Allow $(PRODUCT_NAME) to access your microphone for recording audio.",
          "photoLibraryPermission": "Allow $(PRODUCT_NAME) to access your photo library to manage music artwork."
        }
      ]
    ]
  }
}
```

### iOS Configuration

#### Automatic Setup

The config plugin automatically handles iOS permissions. Just rebuild your app after adding the plugin.

#### Manual Setup (Advanced)

If you need manual configuration, add to your `Info.plist`:

```xml
<key>NSAppleMusicUsageDescription</key>
<string>We need access to your music library to retrieve and organize your audio files.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio content.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to display and manage music artwork.</string>
```

### Android Configuration

#### Automatic Setup

The config plugin automatically adds the necessary permissions. For manual setup:

```xml
<!-- Required for Android 13+ (API 33+) -->
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />

<!-- Fallback for Android 12 and below -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
                 android:maxSdkVersion="28" />

<!-- Optional: For accessing music metadata -->
<uses-permission android:name="android.permission.WAKE_LOCK" />
```

## 🎯 Usage Examples

### Basic Implementation

```javascript
import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import {
  getAssetsAsync,
  getAlbumsAsync,
  requestPermissionsAsync,
  getPermissionsAsync,
} from "expo-music-library";

export default function MusicApp() {
  const [musicFiles, setMusicFiles] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [loading, setLoading] = useState(true);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadMusicData();
  }, []);

  const loadMusicData = async () => {
    try {
      setLoading(true);

      // Check existing permissions
      const { status } = await getPermissionsAsync();

      if (status !== "granted") {
        const { status: newStatus } = await requestPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Music library access is required to display your music collection.",
            [
              { text: "Cancel", style: "cancel" },
              {
                text: "Settings",
                onPress: () => {
                  /* Open settings */
                },
              },
            ]
          );
          return;
        }
      }

      setHasPermission(true);

      // Load music files with metadata
      const assetsResult = await getAssetsAsync({
        first: 50,
        sortBy: ["creationTime", "duration"],
      });

      setMusicFiles(assetsResult.assets);

      // Load albums
      const albumsData = await getAlbumsAsync();
      setAlbums(albumsData);
    } catch (error) {
      console.error("Error loading music data:", error);
      Alert.alert("Error", `Failed to load music data: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds) return "Unknown";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading your music library...</Text>
      </View>
    );
  }

  if (!hasPermission) {
    return (
      <View style={styles.centered}>
        <Text style={styles.permissionText}>Music library access required</Text>
        <Text style={styles.permissionSubtext}>
          Please grant permission to access your music library
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>My Music Library</Text>

      <View style={styles.stats}>
        <Text style={styles.statText}>{musicFiles.length} Songs</Text>
        <Text style={styles.statText}>{albums.length} Albums</Text>
      </View>

      <FlatList
        data={musicFiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.musicItem}>
            <View style={styles.musicInfo}>
              <Text style={styles.filename} numberOfLines={1}>
                {item.filename}
              </Text>
              <Text style={styles.duration}>
                {formatDuration(item.duration)}
              </Text>
            </View>
          </View>
        )}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
    color: "#333",
  },
  stats: {
    flexDirection: "row",
    marginBottom: 20,
  },
  statText: {
    fontSize: 16,
    marginRight: 20,
    color: "#666",
  },
  musicItem: {
    backgroundColor: "white",
    padding: 15,
    marginBottom: 8,
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  musicInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  filename: {
    fontWeight: "600",
    fontSize: 16,
    flex: 1,
    color: "#333",
  },
  duration: {
    color: "#666",
    fontSize: 14,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: "#666",
  },
  permissionText: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
    color: "#333",
  },
  permissionSubtext: {
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    color: "#666",
  },
});
```

### Advanced Music Browser

```javascript
import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import {
  getAssetsAsync,
  getAlbumsAsync,
  getArtistsAsync,
  getGenresAsync,
  getAlbumAssetsAsync,
  getGenreAssetsAsync,
} from "expo-music-library";

export default function AdvancedMusicBrowser() {
  const [activeTab, setActiveTab] = useState("songs");
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredData, setFilteredData] = useState([]);

  // Load data based on active tab
  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      let result = [];

      switch (activeTab) {
        case "songs":
          const assetsResult = await getAssetsAsync({
            first: 100,
            sortBy: ["creationTime"],
          });
          result = assetsResult.assets;
          break;

        case "albums":
          result = await getAlbumsAsync();
          break;

        case "artists":
          result = await getArtistsAsync();
          break;

        case "genres":
          result = await getGenresAsync();
          break;
      }

      setData(result);
      setFilteredData(result);
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  // Filter data based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredData(data);
    } else {
      const filtered = data.filter((item) => {
        const searchText = searchQuery.toLowerCase();
        if (activeTab === "songs") {
          return item.filename?.toLowerCase().includes(searchText);
        } else if (activeTab === "albums") {
          return item.title?.toLowerCase().includes(searchText);
        } else if (activeTab === "artists" || activeTab === "genres") {
          return item.name?.toLowerCase().includes(searchText);
        }
        return false;
      });
      setFilteredData(filtered);
    }
  }, [searchQuery, data, activeTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const renderItem = ({ item }) => {
    switch (activeTab) {
      case "songs":
        return (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.filename}
            </Text>
            <Text style={styles.itemSubtitle}>
              {item.duration
                ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, "0")}`
                : "Unknown"}
            </Text>
          </TouchableOpacity>
        );

      case "albums":
        return (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={styles.itemSubtitle}>
              {item.assetCount} track{item.assetCount !== 1 ? "s" : ""}
            </Text>
          </TouchableOpacity>
        );

      case "artists":
      case "genres":
        return (
          <TouchableOpacity style={styles.item}>
            <Text style={styles.itemTitle} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        );

      default:
        return null;
    }
  };

  const tabs = [
    { key: "songs", title: "Songs" },
    { key: "albums", title: "Albums" },
    { key: "artists", title: "Artists" },
    { key: "genres", title: "Genres" },
  ];

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <TextInput
        style={styles.searchInput}
        placeholder={`Search ${activeTab}...`}
        value={searchQuery}
        onChangeText={setSearchQuery}
      />

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.activeTab]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.key && styles.activeTabText,
              ]}
            >
              {tab.title}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Content */}
      <FlatList
        data={filteredData}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshing={loading}
        onRefresh={loadData}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  searchInput: {
    margin: 16,
    padding: 12,
    backgroundColor: "white",
    borderRadius: 8,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "white",
    marginHorizontal: 16,
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: "center",
    borderRadius: 6,
  },
  activeTab: {
    backgroundColor: "#007AFF",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  activeTabText: {
    color: "white",
  },
  item: {
    backgroundColor: "white",
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
    borderRadius: 8,
  },
  itemTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
  },
  itemSubtitle: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
});
```

## 📚 Complete API Reference

### Core Functions

#### `getAssetsAsync(options?: AssetsOptions)`

Retrieves audio assets with advanced filtering and pagination support.

**Parameters:**

```typescript
interface AssetsOptions {
  first?: number; // Number of assets to retrieve (default: 20, max: 1000)
  after?: string; // Cursor for pagination
  sortBy?: SortBy[]; // Array of sort criteria
  createdAfter?: number; // Filter by creation timestamp (milliseconds)
  createdBefore?: number; // Filter by creation timestamp (milliseconds)
  mediaType?: "audio"; // Media type filter (always 'audio' for this library)
  album?: string; // Filter by album name
  artist?: string; // Filter by artist name
}

type SortBy =
  | "default"
  | "id"
  | "creationTime"
  | "modificationTime"
  | "mediaType"
  | "width"
  | "height"
  | "duration";
```

**Returns:**

```typescript
interface AssetsResult {
  assets: Asset[];
  hasNextPage: boolean;
  endCursor: string;
  totalCount?: number; // Available on some platforms
}
```

#### `getAlbumsAsync()`

Retrieves all albums with metadata.

**Returns:** `Promise<Album[]>`

#### `getArtistsAsync()`

Retrieves all artists with track counts.

**Returns:** `Promise<Artist[]>`

#### `getGenresAsync()`

Retrieves all genres available in the music library.

**Returns:** `Promise<Genre[]>`

#### `getAlbumAssetsAsync(albumName: string, options?: AlbumAssetsOptions)`

Retrieves all tracks from a specific album.

**Parameters:**

- `albumName`: Exact album name
- `options`: Optional sorting and filtering

**Returns:** `Promise<Asset[]>`

#### `getGenreAssetsAsync(genreId: string)`

Retrieves all tracks from a specific genre (Android only).

**Returns:** `Promise<Asset[]>`

#### `getFolderAssetsAsync(folderId: string)`

Retrieves all tracks from a specific folder.

**Returns:** `Promise<Asset[]>`

### Permission Management

#### `requestPermissionsAsync(writeOnly?: boolean)`

Requests media library permissions with granular control.

**Parameters:**

- `writeOnly` (optional): Request write-only permissions (default: false)

**Returns:**

```typescript
interface PermissionResponse {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  granted: boolean;
  expires: "never" | number;
}
```

#### `getPermissionsAsync(writeOnly?: boolean)`

Checks current permission status without requesting.

**Returns:** `Promise<PermissionResponse>`

### Enhanced Type Definitions

```typescript
interface Asset {
  // Core properties
  id: string;
  filename: string;
  uri: string;
  mediaType: "audio";

  // Dimensions (usually 0 for audio)
  width: number;
  height: number;

  // Timestamps
  creationTime: number;
  modificationTime: number;

  // Audio-specific properties
  duration: number;

  // Extended metadata (platform-dependent)
  albumId?: string;
  albumName?: string;
  artistId?: string;
  artistName?: string;
  title?: string;
  trackNumber?: number;
  year?: number;
  genre?: string;
  bitrate?: number;
  sampleRate?: number;
  channels?: number;

  // File system properties
  localUri?: string;
  size?: number;
  mimeType?: string;
}

interface Album {
  id: string;
  title: string;
  assetCount: number;

  // Extended properties
  artistId?: string;
  artistName?: string;
  year?: number;
  duration?: number;
  coverUri?: string;
  genres?: string[];
}

interface Artist {
  id: string;
  name: string;

  // Extended properties
  albumCount?: number;
  trackCount?: number;
  genres?: string[];
}

interface Genre {
  id: string;
  name: string;

  // Extended properties
  trackCount?: number;
  artistCount?: number;
}
```

## 🎯 Advanced Usage Patterns

### Infinite Scrolling Implementation

```javascript
import { useState, useCallback } from "react";

export const useInfiniteMusic = () => {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasNextPage, setHasNextPage] = useState(true);
  const [endCursor, setEndCursor] = useState(null);

  const loadMore = useCallback(async () => {
    if (loading || !hasNextPage) return;

    setLoading(true);
    try {
      const result = await getAssetsAsync({
        first: 20,
        after: endCursor,
        sortBy: ["creationTime"],
      });

      setAssets((prev) => [...prev, ...result.assets]);
      setHasNextPage(result.hasNextPage);
      setEndCursor(result.endCursor);
    } catch (error) {
      console.error("Error loading more assets:", error);
    } finally {
      setLoading(false);
    }
  }, [loading, hasNextPage, endCursor]);

  const refresh = useCallback(async () => {
    setAssets([]);
    setEndCursor(null);
    setHasNextPage(true);
    await loadMore();
  }, []);

  return {
    assets,
    loading,
    hasNextPage,
    loadMore,
    refresh,
  };
};
```

## 🔧 Best Practices & Performance

### Memory Management

```javascript
// Good: Use pagination for large libraries
const loadMusicEfficiently = async () => {
  const BATCH_SIZE = 50;
  let allAssets = [];
  let hasMore = true;
  let cursor = null;

  while (hasMore && allAssets.length < 500) {
    // Limit total
    const result = await getAssetsAsync({
      first: BATCH_SIZE,
      after: cursor,
    });

    allAssets = [...allAssets, ...result.assets];
    hasMore = result.hasNextPage;
    cursor = result.endCursor;
  }

  return allAssets;
};

// Good: Implement virtual lists for large datasets
import { VirtualizedList } from "react-native";

const VirtualMusicList = ({ data }) => (
  <VirtualizedList
    data={data}
    renderItem={({ item }) => <MusicItem item={item} />}
    keyExtractor={(item) => item.id}
    getItemCount={() => data.length}
    getItem={(data, index) => data[index]}
    windowSize={10}
    maxToRenderPerBatch={20}
    removeClippedSubviews={true}
  />
);
```

### Error Handling

```javascript
const robustMusicLoader = async () => {
  const maxRetries = 3;
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      const result = await getAssetsAsync({ first: 20 });
      return result;
    } catch (error) {
      attempt++;

      if (error.code === "PERMISSION_DENIED") {
        throw new Error("Music library access denied");
      }

      if (attempt === maxRetries) {
        throw new Error(`Failed to load music after ${maxRetries} attempts`);
      }

      // Exponential backoff
      await new Promise((resolve) =>
        setTimeout(resolve, Math.pow(2, attempt) * 1000)
      );
    }
  }
};
```

### Caching Strategy

```javascript
import AsyncStorage from "@react-native-async-storage/async-storage";

const CACHE_KEY = "music_library_cache";
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export const getCachedMusic = async () => {
  try {
    const cached = await AsyncStorage.getItem(CACHE_KEY);
    if (cached) {
      const { data, timestamp } = JSON.parse(cached);
      if (Date.now() - timestamp < CACHE_DURATION) {
        return data;
      }
    }
    return null;
  } catch (error) {
    console.error("Error reading cache:", error);
    return null;
  }
};

export const setCachedMusic = async (data) => {
  try {
    const cacheData = {
      data,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch (error) {
    console.error("Error writing cache:", error);
  }
};
```

## 🐛 Troubleshooting Guide

### Common Issues & Solutions

#### Permission Issues

**Problem**: "Permission denied" error

```javascript
// Solution: Proper permission flow
const handlePermissions = async () => {
  const { status } = await getPermissionsAsync();

  if (status === "undetermined") {
    const { status: newStatus } = await requestPermissionsAsync();
    return newStatus === "granted";
  }

  if (status === "denied") {
    Alert.alert(
      "Permission Required",
      "Please enable music library access in Settings",
      [{ text: "Open Settings", onPress: openSettings }]
    );
    return false;
  }

  return status === "granted";
};
```

**Problem**: No music found on device

```javascript
// Solution: Check multiple sources and provide feedback
const diagnoseMusicIssues = async () => {
  const assets = await getAssetsAsync({ first: 1 });

  if (assets.assets.length === 0) {
    // Check if device has any audio files
    const allMediaResult = await getAssetsAsync({
      first: 1,
      mediaType: "audio",
    });

    if (allMediaResult.assets.length === 0) {
      Alert.alert(
        "No Music Found",
        "No audio files were found on this device. Please add music files to your device's music library."
      );
    }
  }
};
```

#### Build Issues

**Problem**: Build fails after installation

```bash
# Solutions:
# 1. Clean and rebuild
expo prebuild --clean
expo run:android --clear

# 2. For iOS, ensure pods are installed
cd ios && pod install && cd ..

# 3. Clear Metro cache
npx expo start --reset-cache
```

**Problem**: Module not found in runtime

```javascript
// Solution: Ensure proper imports and check platform compatibility
import { Platform } from "react-native";
import * as MusicLibrary from "expo-music-library";

const checkCompatibility = () => {
  if (Platform.OS !== "ios" && Platform.OS !== "android") {
    throw new Error("expo-music-library only supports iOS and Android");
  }
};
```

### Performance Issues

**Problem**: Slow loading with large libraries

```javascript
// Solution: Implement progressive loading
const progressiveLoader = async (onProgress) => {
  const BATCH_SIZE = 25;
  let cursor = null;
  let allAssets = [];
  let totalLoaded = 0;

  while (true) {
    const result = await getAssetsAsync({
      first: BATCH_SIZE,
      after: cursor,
      sortBy: ["creationTime"],
    });

    allAssets = [...allAssets, ...result.assets];
    totalLoaded += result.assets.length;

    onProgress?.({
      loaded: totalLoaded,
      hasMore: result.hasNextPage,
      assets: allAssets,
    });

    if (!result.hasNextPage) break;
    cursor = result.endCursor;

    // Add small delay to prevent blocking UI
    await new Promise((resolve) => setTimeout(resolve, 10));
  }

  return allAssets;
};
```

**Problem**: Memory issues with large datasets

```javascript
// Solution: Use WeakMap for caching and cleanup
const assetCache = new WeakMap();
const albumArtCache = new Map();

const optimizedAssetLoader = {
  async loadAsset(id) {
    // Check cache first
    if (assetCache.has(id)) {
      return assetCache.get(id);
    }

    const asset = await getAssetByIdAsync(id);
    assetCache.set(id, asset);
    return asset;
  },

  clearCache() {
    albumArtCache.clear();
    // WeakMap will be cleaned up automatically
  },
};
```

## 📱 Platform-Specific Features

### iOS Specific Features

```javascript
import { Platform } from "react-native";

// iOS-specific metadata access
const getIOSMetadata = async (asset) => {
  if (Platform.OS !== "ios") return null;

  // iOS provides richer metadata through AVAsset
  return {
    appleMusicId: asset.appleMusicId,
    iCloudStatus: asset.iCloudStatus,
    albumArtist: asset.albumArtist,
    composer: asset.composer,
    lyrics: asset.lyrics,
  };
};

// Check if song is available locally (not just in iCloud)
const isLocallyAvailable = (asset) => {
  return Platform.OS === "ios" ? asset.iCloudStatus === "local" : true; // Android files are always local
};
```

### Android Specific Features

```javascript
// Android-specific genre support
const getAndroidGenres = async () => {
  if (Platform.OS !== "android") return [];

  const genres = await getGenresAsync();
  return genres.map((genre) => ({
    ...genre,
    trackCount: genre.trackCount || 0,
  }));
};

// Android folder structure access
const getAndroidFolders = async () => {
  if (Platform.OS !== "android") return [];

  // Android provides folder-based organization
  const folders = await getFoldersAsync();
  return folders.filter((folder) => folder.assetCount > 0);
};

// Android-specific sorting options
const getAndroidSortedAssets = async (sortType) => {
  const sortOptions = {
    title: ["filename"],
    artist: ["artistName", "filename"],
    album: ["albumName", "trackNumber"],
    duration: ["duration", "filename"],
    dateAdded: ["creationTime"],
    dateModified: ["modificationTime"],
  };

  return await getAssetsAsync({
    first: 100,
    sortBy: sortOptions[sortType] || ["filename"],
  });
};
```

## 🎨 UI/UX Best Practices

### Loading States

```javascript
const LoadingStates = {
  // Skeleton loader for music items
  MusicItemSkeleton: () => (
    <View style={styles.skeletonItem}>
      <View style={styles.skeletonTitle} />
      <View style={styles.skeletonSubtitle} />
    </View>
  ),

  // Progressive loading indicator
  ProgressiveLoader: ({ loaded, total, hasMore }) => (
    <View style={styles.progressContainer}>
      <Text>Loading your music library...</Text>
      <Text>
        {loaded} of {hasMore ? "?" : total} tracks loaded
      </Text>
      <ProgressBar progress={hasMore ? 0.5 : loaded / total} />
    </View>
  ),
};

const styles = StyleSheet.create({
  skeletonItem: {
    padding: 16,
    backgroundColor: "white",
    marginBottom: 8,
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonSubtitle: {
    height: 12,
    backgroundColor: "#F0F0F0",
    borderRadius: 4,
    width: "60%",
  },
});
```

### Empty States

```javascript
const EmptyStates = {
  NoMusic: () => (
    <View style={styles.emptyState}>
      <MaterialIcons name="library-music" size={64} color="#CCC" />
      <Text style={styles.emptyTitle}>No Music Found</Text>
      <Text style={styles.emptySubtitle}>
        Add music files to your device's music library to get started
      </Text>
      <TouchableOpacity style={styles.emptyButton}>
        <Text style={styles.emptyButtonText}>Learn How</Text>
      </TouchableOpacity>
    </View>
  ),

  NoPermission: ({ onRequestPermission }) => (
    <View style={styles.emptyState}>
      <MaterialIcons name="music-off" size={64} color="#FF6B6B" />
      <Text style={styles.emptyTitle}>Music Access Required</Text>
      <Text style={styles.emptySubtitle}>
        We need permission to access your music library
      </Text>
      <TouchableOpacity
        style={styles.permissionButton}
        onPress={onRequestPermission}
      >
        <Text style={styles.permissionButtonText}>Grant Permission</Text>
      </TouchableOpacity>
    </View>
  ),
};
```

### Accessibility Features

```javascript
const AccessibleMusicItem = ({ item, onPlay, onAddToPlaylist }) => (
  <TouchableOpacity
    style={styles.musicItem}
    onPress={() => onPlay(item)}
    accessible={true}
    accessibilityRole="button"
    accessibilityLabel={`Play ${item.filename}`}
    accessibilityHint="Double tap to play this song"
  >
    <View style={styles.musicInfo}>
      <Text style={styles.filename} accessibilityRole="text">
        {item.filename}
      </Text>
      <Text
        style={styles.duration}
        accessibilityLabel={`Duration: ${formatDuration(item.duration)}`}
      >
        {formatDuration(item.duration)}
      </Text>
    </View>

    <TouchableOpacity
      style={styles.actionButton}
      onPress={() => onAddToPlaylist(item)}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel="Add to playlist"
    >
      <MaterialIcons name="playlist-add" size={24} color="#666" />
    </TouchableOpacity>
  </TouchableOpacity>
);
```

## 🧪 Testing

### Unit Testing

```javascript
// __tests__/musicLibrary.test.js
import { getAssetsAsync, getAlbumsAsync } from "expo-music-library";

// Mock the module for testing
jest.mock("expo-music-library", () => ({
  getAssetsAsync: jest.fn(),
  getAlbumsAsync: jest.fn(),
  requestPermissionsAsync: jest.fn(),
  getPermissionsAsync: jest.fn(),
}));

describe("Music Library Integration", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("should load assets successfully", async () => {
    const mockAssets = {
      assets: [
        { id: "1", filename: "song1.mp3", duration: 180 },
        { id: "2", filename: "song2.mp3", duration: 240 },
      ],
      hasNextPage: false,
      endCursor: "cursor123",
    };

    getAssetsAsync.mockResolvedValue(mockAssets);

    const result = await getAssetsAsync({ first: 2 });

    expect(result.assets).toHaveLength(2);
    expect(result.assets[0].filename).toBe("song1.mp3");
    expect(getAssetsAsync).toHaveBeenCalledWith({ first: 2 });
  });

  test("should handle permission errors", async () => {
    const permissionError = new Error("Permission denied");
    permissionError.code = "PERMISSION_DENIED";

    getAssetsAsync.mockRejectedValue(permissionError);

    await expect(getAssetsAsync()).rejects.toThrow("Permission denied");
  });

  test("should load albums with correct structure", async () => {
    const mockAlbums = [
      { id: "1", title: "Album 1", assetCount: 10 },
      { id: "2", title: "Album 2", assetCount: 15 },
    ];

    getAlbumsAsync.mockResolvedValue(mockAlbums);

    const albums = await getAlbumsAsync();

    expect(albums).toHaveLength(2);
    expect(albums[0]).toHaveProperty("title");
    expect(albums[0]).toHaveProperty("assetCount");
  });
});
```

### Integration Testing

```javascript
// __tests__/integration/musicApp.test.js
import React from "react";
import { render, fireEvent, waitFor } from "@testing-library/react-native";
import MusicApp from "../MusicApp";

describe("MusicApp Integration Tests", () => {
  test("should load and display music library", async () => {
    const { getByText, queryByText } = render(<MusicApp />);

    // Should show loading initially
    expect(getByText("Loading your music library...")).toBeTruthy();

    // Wait for music to load
    await waitFor(() => {
      expect(queryByText("Loading your music library...")).toBeNull();
    });

    // Should display music count
    expect(getByText(/\d+ Songs/)).toBeTruthy();
  });

  test("should handle permission denial gracefully", async () => {
    // Mock permission denial
    const mockPermissionDenied = {
      status: "denied",
      canAskAgain: false,
      granted: false,
    };

    jest
      .spyOn(require("expo-music-library"), "getPermissionsAsync")
      .mockResolvedValue(mockPermissionDenied);

    const { getByText } = render(<MusicApp />);

    await waitFor(() => {
      expect(getByText("Music library access required")).toBeTruthy();
    });
  });
});
```

## 🚀 Migration Guide

### From v1.x to v2.x

```javascript
// Old API (v1.x)
import * as MediaLibrary from "expo-media-library";

const oldWay = async () => {
  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status === "granted") {
    const media = await MediaLibrary.getAssetsAsync({
      mediaType: "audio",
      first: 20,
    });
    return media.assets;
  }
};

// New API (v2.x)
import * as MusicLibrary from "expo-music-library";

const newWay = async () => {
  const { status } = await MusicLibrary.requestPermissionsAsync();
  if (status === "granted") {
    const result = await MusicLibrary.getAssetsAsync({
      first: 20,
      sortBy: ["creationTime"], // New: Enhanced sorting
    });
    return result.assets; // Enhanced with more metadata
  }
};
```

### Breaking Changes

1. **Enhanced Asset Structure**: Assets now include more metadata
2. **New Permission Model**: More granular permission control
3. **Improved Sorting**: Multiple sort criteria support
4. **Platform-Specific Features**: iOS and Android optimizations

## 🔒 Security & Privacy

### Permission Best Practices

```javascript
const PrivacyCompliantMusicAccess = {
  // Request permissions with clear explanation
  async requestWithExplanation() {
    Alert.alert(
      "Music Library Access",
      "This app needs access to your music library to play and organize your songs. We never share your music data with third parties.",
      [
        { text: "Not Now", style: "cancel" },
        {
          text: "Allow",
          onPress: async () => {
            await requestPermissionsAsync();
          },
        },
      ]
    );
  },

  // Minimal data collection
  sanitizeAssetData(asset) {
    return {
      id: asset.id,
      filename: asset.filename,
      duration: asset.duration,
      // Exclude potentially sensitive metadata
    };
  },

  // Respect user privacy settings
  async respectPrivacySettings() {
    const { status } = await getPermissionsAsync();

    if (status === "denied") {
      // Don't repeatedly ask for permissions
      return null;
    }

    return await getAssetsAsync({ first: 20 });
  },
};
```

### Data Handling Guidelines

```javascript
const SecureDataHandling = {
  // Never store sensitive file paths
  createSafeReference(asset) {
    return {
      id: asset.id,
      displayName: asset.filename,
      duration: asset.duration,
      // Don't store full file paths or URIs long-term
    };
  },

  // Implement proper cleanup
  cleanup() {
    // Clear any cached URIs or file references
    this.cachedAssets = null;
    this.albumArt = null;
  },
};
```

## 🌍 Internationalization

```javascript
// i18n/translations.js
export const translations = {
  en: {
    musicLibrary: "Music Library",
    songs: "Songs",
    albums: "Albums",
    artists: "Artists",
    genres: "Genres",
    permissionRequired: "Music library access required",
    permissionExplanation:
      "We need access to your music library to play and organize your songs.",
    noMusicFound: "No music found",
    loading: "Loading your music library...",
  },
  es: {
    musicLibrary: "Biblioteca Musical",
    songs: "Canciones",
    albums: "Álbumes",
    artists: "Artistas",
    genres: "Géneros",
    permissionRequired: "Acceso a biblioteca musical requerido",
    permissionExplanation:
      "Necesitamos acceso a tu biblioteca musical para reproducir y organizar tus canciones.",
    noMusicFound: "No se encontró música",
    loading: "Cargando tu biblioteca musical...",
  },
  fr: {
    musicLibrary: "Bibliothèque Musicale",
    songs: "Chansons",
    albums: "Albums",
    artists: "Artistes",
    genres: "Genres",
    permissionRequired: "Accès à la bibliothèque musicale requis",
    permissionExplanation:
      "Nous avons besoin d'accéder à votre bibliothèque musicale pour lire et organiser vos chansons.",
    noMusicFound: "Aucune musique trouvée",
    loading: "Chargement de votre bibliothèque musicale...",
  },
};

// Usage in components
import { useTranslation } from "react-i18next";

const MusicLibraryHeader = () => {
  const { t } = useTranslation();

  return <Text style={styles.title}>{t("musicLibrary")}</Text>;
};
```

## 🔄 Future Roadmap

### Planned Features

- **Real-time Library Updates**: Listen to music library changes
- **Enhanced Search**: Full-text search across metadata
- **Playlist Support**: Create and manage custom playlists
- **Cloud Integration**: Support for streaming services
- **Audio Analysis**: Automatic BPM and key detection
- **Smart Recommendations**: AI-powered music suggestions

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/dev-josias/expo-music-library.git
cd expo-music-library

# Install dependencies
npm install

# Build the project
npm run build

# Run tests
npm test

# Run example app
cd example
npm install
expo run:ios # or expo run:android
```

### Contribution Guidelines

1. **Fork** the repository
2. Create a **feature branch**: `git checkout -b feature/amazing-feature`
3. **Write tests** for your changes
4. **Update documentation** if needed
5. **Commit** with clear messages: `git commit -m 'feat: add amazing feature'`
6. **Push** to your branch: `git push origin feature/amazing-feature`
7. **Create a Pull Request**

### Code Style

We use ESLint and Prettier for consistent code formatting:

```bash
# Check code style
npm run lint

# Fix auto-fixable issues
npm run lint:fix

# Format code
npm run prettier
```

### Testing Guidelines

- Write unit tests for new features
- Include integration tests for complex functionality
- Test on both iOS and Android
- Add performance tests for data-intensive operations

## 📄 License

This project is licensed under the MIT License:

```
MIT License

Copyright (c) 2024 Kologo Josias

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## 🆘 Support & Community

### Getting Help

- 📖 **Documentation**: [GitHub README](https://github.com/dev-josias/expo-music-library#readme)
- 🐛 **Bug Reports**: [Issue Tracker](https://github.com/dev-josias/expo-music-library/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/dev-josias/expo-music-library/discussions)
- 📧 **Direct Support**: kologojosias@gmail.com

### Community Resources

- **Stack Overflow**: Tag your questions with `expo-music-library`
- **Discord**: Join the Expo community Discord
- **Reddit**: r/reactnative and r/expo
- **Twitter**: Follow [@dev_josias](https://twitter.com/dev_josias) for updates

### Support the Project

If this library has helped you, consider:

- ⭐ **Star the repository** on GitHub
- 🐛 **Report bugs** and suggest features
- 📝 **Contribute** to the codebase
- 📢 **Share** with the community
- ☕ **Buy me a coffee** (link in GitHub profile)

## 📞 Contact

**Kologo Josias**  
_Full-Stack Developer & Open Source Contributor_

- 📧 **Email**: [kologojosias@gmail.com](mailto:kologojosias@gmail.com)
- 🐙 **GitHub**: [@dev-josias](https://github.com/dev-josias)
- 💼 **LinkedIn**: [Kologo Josias](https://linkedin.com/in/kologojosias)
- 🌐 **Portfolio**: [kologojosias.com](https://kologojosias.com)
- 🏢 **Company**: [Yoshimyra SARL](https://yoshimyra.com)

---

<div align="center">
  
**Made with ❤️ by [Kologo Josias](https://github.com/dev-josias)**

_Building the future of mobile music experiences_

[![GitHub](https://img.shields.io/badge/GitHub-100000?style=for-the-badge&logo=github&logoColor=white)](https://github.com/dev-josias)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-0077B5?style=for-the-badge&logo=linkedin&logoColor=white)](https://linkedin.com/in/kologo-josias)
[![Portfolio](https://img.shields.io/badge/Portfolio-FF5722?style=for-the-badge&logo=todoist&logoColor=white)](https://kologojosias.com)

</div>
