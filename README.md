# Expo Music Library

[![npm](https://img.shields.io/npm/v/expo-music-library)](https://www.npmjs.com/package/expo-music-library)
[![CI](https://github.com/dev-josias/expo-music-library/actions/workflows/ci.yml/badge.svg)](https://github.com/dev-josias/expo-music-library/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)

An Expo native module for querying audio-library metadata, availability,
albums, artists, genres, playlists, and folders on Android and iOS.

The library deliberately distinguishes an item being visible in the music
library from its audio being available to a third-party app. This matters on
iOS, where Apple Music and iCloud items can have complete metadata but no
local, unprotected audio URL.

## Features

- Paginated audio queries, search, filters, and sorting
- Albums, artists, genres, and platform collections
- Explicit local, cloud-only, DRM-protected, and unavailable states
- Opt-in lazy artwork URIs while preserving existing artwork output by default
- Android MediaStore and iOS MediaPlayer implementations
- Coarse library-change notifications
- TypeScript types and an Expo config plugin

## Platform and Expo compatibility

| Environment | Support |
| --- | --- |
| Android physical device/emulator | Supported when the media library contains audio |
| iOS physical device | Supported |
| iOS Simulator | Module compiles, but the simulator has no real Music library |
| Web | Native API unavailable; `isAvailableAsync()` safely returns `false` |
| Expo Go | Not supported; use a development build |

Version 1.3.2 targets Expo SDK 55 through 57:

| Expo SDK | React Native | React | Minimum Node.js | Expo host minimums |
| --- | --- | --- | --- | --- |
| 55 | 0.83 | 19.2 | 20.19 | Android 7+, iOS 15.1+ |
| 56 | 0.85 | 19.2 | 20.19 | Android 7+, iOS 16.4+ |
| 57 | 0.86 | 19.2 | 22.13 | Android 7+, iOS 16.4+ |

See the [Expo SDK version table](https://docs.expo.dev/versions/latest/) for
the authoritative host requirements. Expo SDK 55 and newer always use React
Native's New Architecture.

## Installation

```bash
npx expo install expo-music-library
```

Add the config plugin:

```json
{
  "expo": {
    "plugins": [
      [
        "expo-music-library",
        {
          "musicLibraryPermission": "Allow $(PRODUCT_NAME) to access your music library."
        }
      ]
    ]
  }
}
```

Then regenerate or rebuild the native project:

```bash
npx expo prebuild
npx expo run:ios
# or
npx expo run:android
```

This package contains native code, so adding it requires a new native build.
An over-the-air JavaScript update alone is not enough.

### What the config plugin changes

| Platform | Configuration |
| --- | --- |
| iOS | Adds `NSAppleMusicUsageDescription` |
| Android 13+ | Adds `READ_MEDIA_AUDIO` |
| Android 12 and older | Adds `READ_EXTERNAL_STORAGE` with `maxSdkVersion="32"` |

The module does not need Photos permission to read `MPMediaItemArtwork`.

For bare projects that do not run Expo prebuild, apply the equivalent settings
manually:

```xml
<!-- ios/Info.plist -->
<key>NSAppleMusicUsageDescription</key>
<string>Allow $(PRODUCT_NAME) to access your music library.</string>
```

```xml
<!-- android/app/src/main/AndroidManifest.xml -->
<uses-permission android:name="android.permission.READ_MEDIA_AUDIO" />
<uses-permission
  android:name="android.permission.READ_EXTERNAL_STORAGE"
  android:maxSdkVersion="32" />
```

## Basic usage

```ts
import * as MusicLibrary from "expo-music-library";

async function loadSongs() {
  if (!(await MusicLibrary.isAvailableAsync())) {
    return [];
  }

  const permission = await MusicLibrary.requestPermissionsAsync();
  if (!permission.granted) {
    return [];
  }

  const page = await MusicLibrary.getAssetsAsync({
    first: 50,
    sortBy: ["title", true],
    availability: "all",
    artwork: "uri",
  });

  return page.assets;
}
```

`["title", true]` means title ascending. Multiple sort values use an array:

```ts
sortBy: [["artist", true], ["album", true], "title"];
```

Page sizes must be integers from 1 through 1000.

## Audio availability

Queries return metadata-only entries by default. Inspect availability before
passing an item to AVFoundation, an audio player, an exporter, or a stem
separator:

```ts
const page = await MusicLibrary.getAssetsAsync({
  availability: "all",
});

for (const track of page.assets) {
  if (!track.isLocallyAvailable || !track.canAccessWithAVFoundation) {
    console.log(track.title, track.availability, track.availabilityReason);
    continue;
  }

  const audioUri = track.assetUrl || track.contentUri || track.uri;
  // Use audioUri with an API that supports its URI kind.
}
```

Availability values are:

| Value | Meaning |
| --- | --- |
| `local` | The platform exposes audio the app can access |
| `cloud` | The item is visible but is not downloaded locally |
| `protected` | The item is DRM-protected |
| `unavailable` | No usable native audio URL is currently exposed |

Useful fields include:

```ts
type AssetAvailabilityStatus =
  | "local"
  | "cloud"
  | "protected"
  | "unavailable";

type Asset = {
  // Existing 1.x fields
  id: string;
  title: string;
  artist: string;
  uri: string;
  artwork?: string;
  duration: number;

  // Additive 1.3.1 fields
  assetUrl?: string | null;
  contentUri?: string | null;
  uriKind?: "ipod-library" | "content" | "file" | "none";
  artworkUri?: string | null;
  availability?: AssetAvailabilityStatus;
  availabilityReason?: "cloud" | "protected" | "missingAssetUrl" | null;
  isCloudItem?: boolean;
  hasProtectedAsset?: boolean;
  hasAssetUrl?: boolean;
  hasLocalAssetURL?: boolean;
  canAccessWithAVFoundation?: boolean;
  isLocallyAvailable?: boolean;
  isPlayable?: boolean;
  mimeType?: string | null;
  fileSize?: number | null;
  albumTitle?: string | null;
  trackNumber?: number | null;
  discNumber?: number | null;
};
```

`uri` remains a required string for 1.x compatibility, but it may be empty for
an iOS metadata-only item. New code should prefer the explicit availability and
URI fields.

### Apple Music, purchased songs, and downloaded songs

iOS returns items known to the user's Music library, including some cloud and
Apple Music subscription entries. Library visibility does not guarantee that
`MPMediaItem.assetURL` exists.

- A cloud-only purchased track generally needs to be downloaded in Apple's
  Music app before a local asset URL can become available.
- Downloading does not remove DRM. Apple Music subscription tracks can remain
  protected and cannot be exported, decoded, or sent to a stem separator
  through a normal third-party file API.
- A purchased item can still lack an accessible URL depending on its format,
  account state, sync state, or platform policy.
- For reliable editing and separation, import an unprotected audio file the
  user is authorized to process.

The module cannot initiate an Apple Music download or bypass DRM.

To request only usable iOS AVFoundation items:

```ts
const localPage = await MusicLibrary.getAssetsAsync({
  availability: "avFoundationAccessible",
  artwork: "none",
});
```

Available filters are:

- `"all"` — all matching metadata, including unavailable items
- `"hasAssetUrl"` — items for which the platform exposes an asset URL
- `"avFoundationAccessible"` — unprotected items expected to work with
  AVFoundation

## Artwork

`artwork: "legacy"` is the default and preserves the 1.3.0 `artwork` field.
On iOS that field remains raw JPEG base64; on Android it remains a URI.
The additive `artworkUri` field is a lazy `music-artwork://<persistentID>` URI
on iOS and a MediaStore content URI on Android.

Use `artwork: "uri"` to put the lazy URI in both `artwork` and `artworkUri`, or
`artwork: "none"` for large metadata-only queries.

```tsx
<Image source={{ uri: track.artworkUri || track.artwork }} />
```

When rendering the legacy iOS field directly, add a
`data:image/jpeg;base64,` prefix. Do not add that prefix to `artworkUri`.

## Pagination

Every asset page has this shape:

```ts
type PagedInfo<T> = {
  assets: T[];
  endCursor: string;
  hasNextPage: boolean;
  totalCount: number;
};
```

`endCursor` is opaque and platform-specific. Pass it back unchanged; do not
parse it or assume it is an asset ID or numeric offset.

```ts
const firstPage = await MusicLibrary.getAssetsAsync({ first: 20 });

const nextPage = await MusicLibrary.getAssetsAsync({
  first: 20,
  after: firstPage.endCursor,
});
```

## Search and filters

```ts
const matches = await MusicLibrary.searchAssetsAsync("Beatles", {
  first: 25,
  album: "album-id",
  createdAfter: new Date("2020-01-01T00:00:00Z"),
  sortBy: [["artist", true], ["album", true], ["title", true]],
  availability: "all",
});
```

`createdAfter` and `createdBefore` accept a valid `Date` or a finite Unix
timestamp in milliseconds.

## Albums, artists, genres, and collections

```ts
const albums = await MusicLibrary.getAlbumsAsync();
const artists = await MusicLibrary.getArtistsAsync();
const genres = await MusicLibrary.getGenresAsync();
const collections = await MusicLibrary.getFoldersAsync();

const albumTracks = await MusicLibrary.getAlbumAssetsAsync(albums[0].id, {
  first: 20,
  availability: "all",
});
```

The legacy `Folder` API has platform-specific semantics:

- Android folders represent filesystem/MediaStore audio directories.
- iOS folders represent Music playlists.

Use `getCapabilitiesAsync()` when the distinction matters:

```ts
const capabilities = await MusicLibrary.getCapabilitiesAsync();

type MusicLibraryCapabilities = {
  playlists: boolean;
  directories: boolean;
  cloudItems: boolean;
  protectedAssets: boolean;
  uriSchemes: Array<"ipod-library" | "content" | "file">;
};
```

## Library changes

Change notifications are reload signals, not incremental diffs:

```ts
const subscription = MusicLibrary.addChangeListener((event) => {
  if (event.requiresFullReload) {
    void reloadCurrentQuery();
  }
});

subscription.remove();
```

The event payload is:

```ts
type ChangeEventPayload = {
  hasIncrementalChanges: boolean; // false at runtime since 1.3.1
  requiresFullReload?: boolean; // true at runtime since 1.3.1
  requiresReload?: boolean; // compatibility alias
};
```

## API

```ts
isAvailableAsync(): Promise<boolean>
getPermissionsAsync(writeOnly?: boolean): Promise<PermissionResponse>
requestPermissionsAsync(writeOnly?: boolean): Promise<PermissionResponse>
getCapabilitiesAsync(): Promise<MusicLibraryCapabilities>

getAssetsAsync(options?: AssetsOptions): Promise<PagedInfo<Asset>>
searchAssetsAsync(query: string, options?: AssetsOptions): Promise<PagedInfo<Asset>>
getAssetByIdAsync(id: string): Promise<Asset>

getAlbumsAsync(): Promise<Album[]>
getAlbumAssetsAsync(id: string, options?: SubQueryOptions): Promise<PagedInfo<Asset>>
getArtistsAsync(): Promise<Artist[]>
getArtistAssetsAsync(id: string, options?: SubQueryOptions): Promise<PagedInfo<Asset>>
getGenresAsync(): Promise<Genre[]>
getGenreAssetsAsync(id: string, options?: SubQueryOptions): Promise<PagedInfo<Asset>>
getFoldersAsync(): Promise<Folder[]>
getFolderAssetsAsync(id: string, options?: SubQueryOptions): Promise<PagedInfo<Asset>>

addChangeListener(listener: (event: ChangeEventPayload) => void): {
  remove(): void;
}
```

`writeOnly` remains in the permission methods for backward compatibility. The
module itself is read-only.

## Troubleshooting

### The package name is rejected as a config plugin

Version 1.3.1 and newer include the root `app.plugin.js` entry point expected by Expo.
Upgrade the package, then rerun prebuild and rebuild the native app.

### A song is listed but cannot play or separate

Check `availability`, `availabilityReason`, `hasProtectedAsset`,
`hasAssetUrl`, and `canAccessWithAVFoundation`. On iOS, metadata-only cloud and
protected items are expected. Downloading a purchased song may help; downloading
an Apple Music subscription item does not remove DRM.

### The iOS Simulator returns no songs

Use a physical iPhone or iPad. The simulator does not contain the user's real
Music library.

### Android permission is denied on API 33+

Rebuild after applying the plugin. Android 13 and newer use
`READ_MEDIA_AUDIO`; `READ_EXTERNAL_STORAGE` is limited to API 32 and older.

## License

[MIT](./LICENSE) © Kologo Josias
