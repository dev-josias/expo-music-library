# Expo Music Library

![npm](https://img.shields.io/npm/v/expo-music-library)
![License](https://img.shields.io/npm/l/expo-music-library)
![Downloads](https://img.shields.io/npm/dm/expo-music-library)

A powerful Expo native module that provides seamless access to the device's music library, enabling you to read and retrieve audio files, albums, artists, folders, and genres in your React Native applications.

## ✨ Features

- 🎵 **Comprehensive Music Access**: Retrieve audio files, albums, artists, and genres
- 📁 **Folder Management**: Access and organize music by folders
- 🎨 **Rich Metadata**: Get detailed information including artwork, duration, and more
- 📱 **Cross-Platform**: Full support for both Android and iOS
- 🔧 **TypeScript Support**: Complete type definitions included
- ⚡ **Performance Optimized**: Efficient pagination and filtering options

## 🚀 Platform Support

| Platform      | Android | iOS Device | iOS Simulator | Web | Expo Go |
| ------------- | :-----: | :--------: | :-----------: | :-: | :-----: |
| **Supported** |   ✅    |     ✅     |      ✅       | ❌  |   ❌    |

**Requirements:**

- ✅ Expo Development Builds (includes config plugin)
- ✅ Expo SDK 45 or newer
- ❌ Not compatible with Expo Go (requires custom native code)

## 📦 Installation

### Quick Start

```bash
# Using npm
npm install expo-music-library

# Using yarn
yarn add expo-music-library

# Using pnpm
pnpm add expo-music-library
```

### Development Build Setup

If you're using Expo Development Builds, rebuild your app after installation:

```bash
expo run:android
# or
expo run:ios
```

## ⚙️ Configuration

### iOS Configuration

1. **Add permissions to your `app.json` or `app.config.js`:**

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

2. **Manual Info.plist configuration (if needed):**

```xml
<key>NSAppleMusicUsageDescription</key>
<string>We need access to your music library to retrieve audio files.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to manage music artwork.</string>
```

### Android Configuration

Add these permissions to your `AndroidManifest.xml`:

```xml
<!-- Required for Android 13+ -->
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
<uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />

<!-- Fallback for older Android versions -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## 🎯 Usage

### Basic Example

```javascript
import React, { useEffect, useState } from "react";
import { View, Text, FlatList, Alert } from "react-native";
import {
  getAssetsAsync,
  getAlbumsAsync,
  requestPermissionsAsync,
  getPermissionsAsync,
} from "expo-music-library";

export default function MusicApp() {
  const [musicFiles, setMusicFiles] = useState([]);
  const [albums, setAlbums] = useState([]);
  const [hasPermission, setHasPermission] = useState(false);

  useEffect(() => {
    loadMusicData();
  }, []);

  const loadMusicData = async () => {
    try {
      // Check existing permissions
      const { status } = await getPermissionsAsync();

      if (status !== "granted") {
        // Request permissions
        const { status: newStatus } = await requestPermissionsAsync();
        if (newStatus !== "granted") {
          Alert.alert(
            "Permission Required",
            "Please grant music library access to continue."
          );
          return;
        }
      }

      setHasPermission(true);

      // Load music files
      const assets = await getAssetsAsync({
        first: 20,
        sortBy: ["creationTime"],
      });
      setMusicFiles(assets.assets);

      // Load albums
      const albumsData = await getAlbumsAsync();
      setAlbums(albumsData);
    } catch (error) {
      console.error("Error loading music data:", error);
      Alert.alert("Error", "Failed to load music data");
    }
  };

  if (!hasPermission) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Requesting music library permissions...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 20 }}>
        My Music Library
      </Text>

      <Text style={{ fontSize: 18, marginBottom: 10 }}>
        Songs ({musicFiles.length})
      </Text>

      <FlatList
        data={musicFiles}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View
            style={{
              padding: 10,
              borderBottomWidth: 1,
              borderBottomColor: "#eee",
            }}
          >
            <Text style={{ fontWeight: "bold" }}>{item.filename}</Text>
            <Text style={{ color: "#666" }}>
              {item.duration
                ? `${Math.floor(item.duration / 60)}:${String(Math.floor(item.duration % 60)).padStart(2, "0")}`
                : "Unknown duration"}
            </Text>
          </View>
        )}
      />
    </View>
  );
}
```

### Advanced Usage

```javascript
import {
  getAssetsAsync,
  getAlbumsAsync,
  getArtistsAsync,
  getGenresAsync,
  getFolderAssetsAsync,
  getAlbumAssetsAsync,
  getGenreAssetsAsync,
} from "expo-music-library";

// Get paginated assets with custom options
const loadPaginatedMusic = async () => {
  const options = {
    first: 50, // Limit to 50 assets
    after: "cursor_string", // Pagination cursor
    sortBy: ["duration", "creationTime"], // Sort by duration, then creation time
    createdAfter: new Date(2020, 0, 1).getTime(), // Filter by creation date
    createdBefore: new Date().getTime(), // Filter by creation date
  };

  const result = await getAssetsAsync(options);

  return {
    assets: result.assets,
    hasNextPage: result.hasNextPage,
    endCursor: result.endCursor,
  };
};

// Get music by specific criteria
const loadMusicByCategory = async () => {
  try {
    // Get all albums
    const albums = await getAlbumsAsync();
    console.log(`Found ${albums.length} albums`);

    // Get all artists
    const artists = await getArtistsAsync();
    console.log(`Found ${artists.length} artists`);

    // Get all genres
    const genres = await getGenresAsync();
    console.log(`Found ${genres.length} genres`);

    // Get songs from a specific album
    if (albums.length > 0) {
      const albumSongs = await getAlbumAssetsAsync(albums[0].title);
      console.log(
        `Found ${albumSongs.length} songs in album "${albums[0].title}"`
      );
    }

    // Get songs from a specific genre (Android only)
    if (genres.length > 0) {
      const genreSongs = await getGenreAssetsAsync(genres[0].id);
      console.log(
        `Found ${genreSongs.length} songs in genre "${genres[0].name}"`
      );
    }

    // Get songs from a specific folder
    const folderSongs = await getFolderAssetsAsync("your-folder-id");
    console.log(`Found ${folderSongs.length} songs in folder`);
  } catch (error) {
    console.error("Error loading music by category:", error);
  }
};
```

## 📚 API Reference

### Core Functions

#### `getAssetsAsync(options?: AssetsOptions)`

Retrieves a paginated list of audio assets with optional filtering and sorting.

**Parameters:**

- `options` (optional): Configuration object

**Options:**

```typescript
interface AssetsOptions {
  first?: number; // Number of assets to retrieve (default: 20)
  after?: string; // Cursor for pagination
  sortBy?: SortBy[]; // Array of sort criteria
  createdAfter?: number; // Filter by creation date (timestamp)
  createdBefore?: number; // Filter by creation date (timestamp)
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
}
```

#### `getAlbumsAsync()`

Retrieves all albums from the music library.

**Returns:** `Promise<Album[]>`

#### `getArtistsAsync()`

Retrieves all artists from the music library.

**Returns:** `Promise<Artist[]>`

#### `getGenresAsync()`

Retrieves all genres from the music library.

**Returns:** `Promise<Genre[]>`

#### `getAlbumAssetsAsync(albumName: string)`

Retrieves all audio files from a specific album.

**Parameters:**

- `albumName`: Name of the album

**Returns:** `Promise<Asset[]>`

#### `getGenreAssetsAsync(genreId: string)`

Retrieves all audio files from a specific genre (Android only).

**Parameters:**

- `genreId`: ID of the genre

**Returns:** `Promise<Asset[]>`

#### `getFolderAssetsAsync(folderId: string)`

Retrieves all audio files from a specific folder.

**Parameters:**

- `folderId`: ID of the folder

**Returns:** `Promise<Asset[]>`

### Permission Functions

#### `requestPermissionsAsync(writeOnly?: boolean)`

Requests permissions to access the media library.

**Parameters:**

- `writeOnly` (optional): Whether to request write-only permissions (default: false)

**Returns:** `Promise<PermissionResponse>`

#### `getPermissionsAsync(writeOnly?: boolean)`

Checks current permissions for accessing the media library.

**Parameters:**

- `writeOnly` (optional): Whether to check write-only permissions (default: false)

**Returns:** `Promise<PermissionResponse>`

### Type Definitions

```typescript
interface Asset {
  id: string;
  filename: string;
  uri: string;
  mediaType: "audio";
  width: number;
  height: number;
  creationTime: number;
  modificationTime: number;
  duration: number;
  // Additional platform-specific properties
}

interface Album {
  id: string;
  title: string;
  assetCount: number;
  // Additional platform-specific properties
}

interface Artist {
  id: string;
  name: string;
  // Additional platform-specific properties
}

interface Genre {
  id: string;
  name: string;
  // Additional platform-specific properties
}

interface PermissionResponse {
  status: "granted" | "denied" | "undetermined";
  canAskAgain: boolean;
  granted: boolean;
}
```

## 🔧 Best Practices

### Performance Optimization

1. **Use pagination for large music libraries:**

```javascript
const loadMusicInBatches = async () => {
  let allAssets = [];
  let hasNextPage = true;
  let endCursor = null;

  while (hasNextPage) {
    const result = await getAssetsAsync({
      first: 50,
      after: endCursor,
    });

    allAssets = [...allAssets, ...result.assets];
    hasNextPage = result.hasNextPage;
    endCursor = result.endCursor;
  }

  return allAssets;
};
```

2. **Implement proper error handling:**

```javascript
const safeGetAssets = async () => {
  try {
    const assets = await getAssetsAsync({ first: 20 });
    return assets;
  } catch (error) {
    console.error("Failed to load assets:", error);
    return { assets: [], hasNextPage: false, endCursor: null };
  }
};
```

### Memory Management

- Use pagination instead of loading all assets at once
- Implement virtual lists for large datasets
- Cache frequently accessed data appropriately

## 🐛 Troubleshooting

### Common Issues

**Permission Denied:**

- Ensure you've added the correct permissions to your app configuration
- Check that users have granted the necessary permissions
- Test on physical devices rather than simulators when possible

**No Music Found:**

- Verify the device has music files
- Check that the music files are in supported formats
- Ensure permissions are properly granted

**Build Errors:**

- Run `expo prebuild --clean` to regenerate native code
- Ensure you're using Expo SDK 45 or newer
- For iOS, run `cd ios && pod install`

## 📱 Platform Differences

### iOS Specific

- Requires Apple Music library access
- More restrictive permission model
- Better metadata support for artwork

### Android Specific

- Supports genre-based asset retrieval
- Different permission requirements for Android 13+
- May require WRITE_EXTERNAL_STORAGE for older versions

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- 📖 [Documentation](https://github.com/dev-josias/expo-music-library#readme)
- 🐛 [Issue Tracker](https://github.com/dev-josias/expo-music-library/issues)
- 💬 [Discussions](https://github.com/dev-josias/expo-music-library/discussions)

## 📞 Contact

**Kologo Josias**

- Email: kologojosias@gmail.com
- GitHub: [@dev-josias](https://github.com/dev-josias)
- LinkedIn: [Kologo Josias](https://linkedin.com/in/kologo-josias)
- Portfolio: [Kologo Josias](https://kologojosias.com)
- Company: [Yoshimyra](https://yoshimyra.com)

---

Made with ❤️ by [Kologo Josias](https://github.com/dev-josias)
