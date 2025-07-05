# Expo Music Library

![npm](https://img.shields.io/npm/v/expo-music-library)
![License](https://img.shields.io/npm/l/expo-music-library)

`expo-music-library` is an Expo native module that enables you to read and retrieve audio files, albums, album audio, folders, and genres in your React Native applications. This library is designed to work on both Android and iOS platforms.

- Retrieve audio files from the device's music library.
- Access and manage albums, folders, and genres.
- Get detailed information about audio files, including title, artist, artwork, and duration.
- Supports both Android and iOS.

## Supported Platforms

| Platform      | Android | iOS Device | iOS Simulator | Web | Expo Go |
| ------------- | :-----: | :--------: | :-----------: | :-: | :-----: |
| **Supported** |   ✅    |     ✅     |      ✅       | ❌  |   ❌    |

- ✅ You can use this library with Expo Development Builds. It includes a config plugin.
- ❌ This library can't be used in the "Expo Go" app because it requires custom native code.
- **Note**: This library requires Expo SDK 45 or newer.

## Installation

### Prerequisites

Make sure you have a React Native project set up with Expo. If not, you can create one by running:

```bash
npx create-expo-app MyApp
```

### Installing the Module

To install expo-music-library, run:

```bash
yarn add expo-music-library
```

or

```bash
npm add expo-music-library
```

#### Platform-Specific Configuration

##### iOS

    1.	Permissions:

Add the following keys to your Info.plist file to request the necessary permissions:

```xml
<key>NSAppleMusicUsageDescription</key>
<string>We need access to your music library to retrieve audio files.</string>
<key>NSMicrophoneUsageDescription</key>
<string>We need access to your microphone to record audio.</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>We need access to your photo library to manage music artwork.</string>
```

    2.	Pod Installation:

Run the following command to install the necessary CocoaPods:

```bash
cd ios && pod install
```

##### Android

    1.	Permissions:

Add the following permissions to your AndroidManifest.xml:

```xml
  <uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
  <uses-permission android:name="android.permission.READ_MEDIA_VIDEO" />
  <uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
  <uses-permission android:name="android.permission.READ_MEDIA_VISUAL_USER_SELECTED" />
  <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
  <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
```

## Usage

Here’s a basic example of how to use expo-music-library:

```js
import {
  getAlbumsAsync,
  getArtistsAsync,
  getGenresAsync,
  getFolderAssetsAsync,
  getAssetsAsync,
  getAlbumAssetsAsync,
  getGenreAssetsAsync,
  requestPermissionsAsync,
  getPermissionsAsync,
} from "expo-music-library";

async function loadMusicData() {
  // Request permissions
  const permissions = await requestPermissionsAsync();
  console.log("Permissions:", permissions);

  // Get current permissions
  const currentPermissions = await getPermissionsAsync();
  console.log("Current Permissions:", currentPermissions);

  // Get all albums
  const albums = await getAlbumsAsync();
  console.log("Albums:", albums);

  // Get all artists
  const artists = await getArtistsAsync();
  console.log("Artists:", artists);

  // Get all genres
  const genres = await getGenresAsync();
  console.log("Genres:", genres);

  // Get assets in a specific folder by ID
  const folderAssets = await getFolderAssetsAsync("folderId");
  console.log("Folder Assets:", folderAssets);

  // Get all assets default to 20 audio files
  const assets = await getAssetsAsync();
  console.log("Assets:", assets);

  // Get assets with custom options
  const assets = await getAssetsAsync({
    first: 50, // Limit to 50 assets
    sortBy: ["duration"], // Sort by duration
    createdAfter: new Date(2020, 0, 1).getTime(), // Assets created after Jan 1, 2020
  });
  console.log("Assets:", assets);

  // Get assets from a specific album
  const albumAssets = await getAlbumAssetsAsync("albumName");
  console.log("Album Assets:", albumAssets);

  // Get assets from a specific genre only for android
  const genreAssets = await getGenreAssetsAsync("genreId");
  console.log("Genre Assets:", genreAssets);
}

loadMusicData();
```

### Functions

- **getAlbumsAsync()**: Retrieve a list of albums.
- **getArtistsAsync()**: Retrieve a list of artists.
- **getGenresAsync()**: Retrieve a list of genres.
- **getFolderAssetsAsync(folderId: string)**: Retrieve a list of audio files in a specific folder.
- **getAlbumAssetsAsync(albumName: string)**: Retrieve a list of audio files in a specific album.
- **getGenreAssetsAsync(genreId: string)**: Retrieve a list of audio files in a specific genre.
- **getAssetsAsync(assetsOptions: AssetsOptions)**: Retrieve a paginated list of assets with sorting and filtering options.
- **requestPermissionsAsync(writeOnly: boolean = false)**: Request permissions to access the media library.
- **getPermissionsAsync(writeOnly: boolean = false)**: Check the current permissions for accessing the media library.

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

If you have any questions or issues, feel free to open an issue on the GitHub repository or contact the author directly:

- **Author**: Kologo Josias
- **Email**: kologojosias@gmail.com
- **GitHub**: dev-josias

This README was generated to help you get started with the expo-music-library module. Enjoy coding!

### Summary:

- **Functions Section**: Now includes detailed explanations and examples for all the key functions like `getAssetsAsync`, `getAlbumAssetsAsync`, `getGenreAssetsAsync`, `requestPermissionsAsync`, and `getPermissionsAsync`.
- **Usage Example**: The usage section demonstrates how to use these functions together in an example scenario.
- **Event Listeners**: Shows how to listen to changes in the music library.

This `README.md` should provide comprehensive guidance for anyone using your `expo-music-library` module, whether they are working on Android or iOS.
