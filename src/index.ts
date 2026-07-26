import {
  PermissionResponse as EXPermissionResponse,
  UnavailabilityError,
} from "expo-modules-core";

import type { ChangeEventPayload } from "./ExpoMusicLibrary.types";
import ExpoMusicLibrary from "./ExpoMusicLibraryModule";

const MAX_PAGE_SIZE = 1000;
const DEFAULT_PAGE_SIZE = 20;

export type PermissionResponse = EXPermissionResponse & {
  accessPrivileges?: "all" | "limited" | "none";
  /**
   * Whether the granted Music Library permission covers all queried items.
   * @platform ios
   */
  canAccessAllFiles?: boolean;
  /**
   * Whether Music Library artwork may be read under the current permission.
   * @platform ios
   */
  artworkAccess?: boolean;
};

export type MediaTypeValue = "audio";

export type SortByKey =
  | "default"
  | "creationTime"
  | "modificationTime"
  | "duration"
  | "title"
  | "artist"
  | "album";
export type SortByValue = readonly [SortByKey, boolean] | SortByKey;

export type MediaTypeObject = {
  audio: "audio";
};

export type SortByObject = {
  default: "default";
  creationTime: "creationTime";
  modificationTime: "modificationTime";
  duration: "duration";
  title: "title";
  artist: "artist";
  album: "album";
};

/**
 * Describes why an asset can or cannot be accessed as local audio.
 *
 * - `local`: the native platform exposes audio that the app can access.
 * - `cloud`: the item is visible in the library but is not downloaded.
 * - `protected`: the item is DRM-protected.
 * - `unavailable`: no usable audio URL is currently exposed.
 */
export type AssetAvailabilityStatus =
  | "local"
  | "cloud"
  | "protected"
  | "unavailable";

export type AssetAvailabilityReason =
  | "cloud"
  | "protected"
  | "missingAssetUrl"
  | null;

export type AssetUriKind = "ipod-library" | "content" | "file" | "none";

/**
 * Native availability filter. The default, `all`, keeps metadata-only items in
 * results so that callers can explain why an item is unavailable.
 */
export type AssetAvailabilityFilter =
  | "all"
  | "hasAssetUrl"
  | "avFoundationAccessible";

/**
 * Artwork loading mode. `legacy` preserves 1.3.0 output, `uri` opts into lazy
 * artwork URIs, and `none` skips artwork work.
 */
export type ArtworkQueryMode = "legacy" | "uri" | "none";

export type Asset = {
  /**
   * Internal ID that represents an asset.
   */
  id: string;
  /**
   * Filename of the asset.
   */
  filename: string;
  /**
   * Title of the audio file
   */
  title: string;
  /**
   * Legacy artwork field. The default query mode preserves the 1.3.0
   * representation. Prefer `artworkUri` in new code.
   */
  artwork?: string;
  /**
   * Lazy URI for album artwork, or `null` when there is no artwork.
   */
  artworkUri?: string | null;
  /**
   * Artist
   */
  artist: string;
  /**
   * Legacy URI field retained for compatibility. It can be an empty string for
   * metadata-only iOS items. Check the availability fields before playback or
   * file processing.
   */
  uri: string;
  /**
   * Native audio URL when one is exposed by the platform.
   */
  assetUrl?: string | null;
  /**
   * Android MediaStore content URI, when available.
   */
  contentUri?: string | null;
  /**
   * Identifies the URI representation returned for this asset.
   */
  uriKind?: AssetUriKind;
  /**
   * High-level local/cloud/protected availability.
   */
  availability?: AssetAvailabilityStatus;
  /**
   * Explanation for a non-local asset.
   */
  availabilityReason?: AssetAvailabilityReason;
  /**
   * Whether this is an iCloud Music Library or non-downloaded Apple Music item.
   */
  isCloudItem?: boolean;
  /**
   * Whether the item has DRM protection.
   */
  hasProtectedAsset?: boolean;
  /**
   * Whether the native platform exposes an asset URL.
   */
  hasAssetUrl?: boolean;
  /**
   * Compatibility alias used by BeatPoket. Prefer `hasAssetUrl`.
   */
  hasLocalAssetURL?: boolean;
  /**
   * Whether AVFoundation can access the asset directly.
   */
  canAccessWithAVFoundation?: boolean;
  /**
   * Whether local audio is available to third-party processing.
   */
  isLocallyAvailable?: boolean;
  /**
   * Whether the item is expected to be playable by the host app.
   */
  isPlayable?: boolean;
  /**
   * Media type.
   */
  mediaType: MediaTypeValue;
  /**
   * Width of the image or video.
   */
  width: number;
  /**
   * Height of the image or video.
   */
  height: number;
  /**
   * File creation timestamp.
   */
  creationTime: number;
  /**
   * Last modification timestamp.
   */
  modificationTime: number;
  /**
   * Duration of the video or audio asset in seconds.
   */
  duration: number;
  /**
   * MIME type when reported by the platform.
   */
  mimeType?: string | null;
  /**
   * File size in bytes when reported by the platform.
   */
  fileSize?: number | null;
  /**
   * Album title when reported by the platform.
   */
  albumTitle?: string | null;
  /**
   * One-based track number when reported by the platform.
   */
  trackNumber?: number | null;
  /**
   * One-based disc number when reported by the platform.
   */
  discNumber?: number | null;
  /**
   * Album ID that the asset belongs to.
   * @platform android
   */
  albumId?: string;
  /**
   * Artist ID that the asset belongs to.
   */
  artistId?: string;
  /**
   * Genre ID that the asset belongs to.
   */
  genreId?: string;
};

export type Artist = {
  /**
   * Artist ID.
   */
  id: string;
  /**
   * Artist title.
   */
  title: string;
  /**
   * Estimated number of assets on the album.
   */
  assetCount: number;
  /**
   * Artist Songs (Number of songs in albums)
   */
  albumSongs: number;
};

export type Genre = {
  /**
   * Genre ID.
   */
  id: string;
  /**
   * Genre title.
   */
  title: string;
  /**
   * Number of audio assets in this genre.
   */
  assetCount: number;
};

export type Folder = {
  /**
   * Folder ID.
   */
  id: string;
  /**
   * Folder title.
   */
  title: string;
  /**
   * Number of audio assets in this folder.
   */
  assetCount: number;
};

export type Album = {
  /**
   * Album ID.
   */
  id: string;
  /**
   * Album title.
   */
  title: string;
  /**
   * Estimated number of assets on the album.
   */
  assetCount: number;
  /**
   * Album Songs (Number of songs in albums)
   */
  albumSongs: number;

  /**
   * Album's Artist Name
   */
  artist: string;
  /**
   * Album's Artwork
   */
  artwork: string;
  /**
   * Lazy URI for album artwork, or `null` when there is no artwork.
   */
  artworkUri?: string | null;
};

export type AssetsOptions = {
  /**
   * The maximum number of items on a single page.
   * @default 20
   */
  first?: number;
  /**
   * Opaque cursor returned as `endCursor` by the previous page. Do not parse or
   * construct cursors. Passing an Asset remains supported for compatibility.
   */
  after?: Cursor | Asset;
  /**
   * [Album](#album) or its ID to get assets from specific album.
   */
  album?: AlbumRef;
  /**
   * [Artist](#artist) or its ID to get assets from a specific artist.
   */
  artist?: ArtistRef;
  /**
   * [Genre](#genre) or its ID to get assets from a specific genre.
   */
  genre?: GenreRef;
  /**
   * An array of [`SortByValue`](#sortbyvalue)s or a single `SortByValue` value. By default, all
   * keys are sorted in descending order, however you can also pass a pair `[key, ascending]` where
   * the second item is a `boolean` value that means whether to use ascending order. Note that if
   * the `SortBy.default` key is used, then `ascending` argument will not matter. Earlier items have
   * higher priority when sorting out the results.
   * If empty, this method will use the default sorting that is provided by the platform.
   */
  sortBy?: readonly SortByValue[] | SortByValue;
  /**
   * `Date` object or Unix timestamp in milliseconds limiting returned assets only to those that
   * were created after this date.
   */
  createdAfter?: Date | number;
  /**
   * Similarly as `createdAfter`, but limits assets only to those that were created before specified
   * date.
   */
  createdBefore?: Date | number;
  /**
   * Filters assets by native audio availability.
   * @default "all"
   */
  availability?: AssetAvailabilityFilter;
  /**
   * Controls artwork representation. `legacy` preserves the 1.3.0 field while
   * still adding `artworkUri`.
   * @default "legacy"
   */
  artwork?: ArtworkQueryMode;
};

/**
 * Options for sub-collection asset queries (album, artist, genre, folder).
 */
export type SubQueryOptions = {
  /**
   * The maximum number of items on a single page.
   * @default 20
   */
  first?: number;
  /**
   * Opaque cursor from the previous page's `endCursor`.
   */
  after?: Cursor;
  /**
   * Sort order for results.
   */
  sortBy?: readonly SortByValue[] | SortByValue;
  /**
   * Filters assets by native audio availability.
   * @default "all"
   */
  availability?: AssetAvailabilityFilter;
  /**
   * Controls artwork representation. `legacy` preserves the 1.3.0 field while
   * still adding `artworkUri`.
   * @default "legacy"
   */
  artwork?: ArtworkQueryMode;
};

export type PagedInfo<T> = {
  /**
   * A page of [`Asset`](#asset)s fetched by the query.
   */
  assets: T[];
  /**
   * Opaque cursor to pass unchanged as `after` when requesting the next page.
   */
  endCursor: Cursor;
  /**
   * Whether there are more assets to fetch.
   */
  hasNextPage: boolean;
  /**
   * Estimated total number of assets that match the query.
   */
  totalCount: number;
};

export type Cursor = string;

export type AssetRef = Asset | string;

export type AlbumRef = Album | string;

export type ArtistRef = Artist | string;

export type GenreRef = Genre | string;

export type MusicLibraryCapabilities = {
  /**
   * Whether the platform maps library collections to playlists.
   */
  playlists: boolean;
  /**
   * Whether the platform exposes filesystem-like audio directories.
   */
  directories: boolean;
  /**
   * Whether cloud-only items can appear in query results.
   */
  cloudItems: boolean;
  /**
   * Whether DRM-protected items can appear in query results.
   */
  protectedAssets: boolean;
  /**
   * URI kinds the native implementation can return.
   */
  uriSchemes: Exclude<AssetUriKind, "none">[];
};

const SORT_BY_KEYS: readonly SortByKey[] = [
  "default",
  "creationTime",
  "modificationTime",
  "duration",
  "title",
  "artist",
  "album",
];

const AVAILABILITY_FILTERS: readonly AssetAvailabilityFilter[] = [
  "all",
  "hasAssetUrl",
  "avFoundationAccessible",
];

const ARTWORK_MODES: readonly ArtworkQueryMode[] = [
  "legacy",
  "uri",
  "none",
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}

function getId(ref: unknown, optionName: string): string | undefined {
  if (ref == null) {
    return undefined;
  }

  const id = typeof ref === "string" ? ref : isRecord(ref) ? ref.id : undefined;
  if (typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`Option "${optionName}" must be a non-empty ID string.`);
  }
  return id;
}

function requireId(ref: unknown, optionName: string): string {
  const id = getId(ref, optionName);
  if (id == null) {
    throw new Error(`Option "${optionName}" must be a non-empty ID string.`);
  }
  return id;
}

function normalizeFirst(first: unknown): number {
  if (first == null) {
    return DEFAULT_PAGE_SIZE;
  }
  if (
    typeof first !== "number" ||
    !Number.isFinite(first) ||
    !Number.isInteger(first) ||
    first < 1 ||
    first > MAX_PAGE_SIZE
  ) {
    throw new Error(
      `Option "first" must be a finite integer between 1 and ${MAX_PAGE_SIZE}.`
    );
  }
  return first;
}

function normalizeCursor(
  cursor: unknown,
  optionName: string = "after"
): string | null {
  return getId(cursor, optionName) ?? null;
}

function normalizeDate(
  value: unknown,
  optionName: "createdAfter" | "createdBefore"
): number | undefined {
  if (value == null) {
    return undefined;
  }
  const timestamp = value instanceof Date ? value.getTime() : value;
  if (typeof timestamp !== "number" || !Number.isFinite(timestamp)) {
    throw new Error(
      `Option "${optionName}" must be a valid Date or finite timestamp in milliseconds.`
    );
  }
  return timestamp;
}

function isSortTuple(
  value: unknown
): value is readonly [SortByKey, boolean] {
  return (
    Array.isArray(value) &&
    value.length === 2 &&
    typeof value[0] === "string" &&
    typeof value[1] === "boolean"
  );
}

function checkSortByKey(value: unknown): asserts value is SortByKey {
  if (
    typeof value !== "string" ||
    !SORT_BY_KEYS.includes(value as SortByKey)
  ) {
    throw new Error(`Invalid sortBy key: ${String(value)}`);
  }
}

function checkSortBy(value: unknown): asserts value is SortByValue {
  if (Array.isArray(value)) {
    if (!isSortTuple(value)) {
      throw new Error(
        'Invalid sortBy tuple. Expected [SortByKey, boolean], for example ["title", true].'
      );
    }
    checkSortByKey(value[0]);
    return;
  }
  checkSortByKey(value);
}

function normalizeSortBy(value: unknown): SortByValue[] {
  if (value == null) {
    return ["default"];
  }
  if (typeof value === "string" || isSortTuple(value)) {
    checkSortBy(value);
    return [value];
  }
  if (!Array.isArray(value)) {
    throw new Error(
      'Option "sortBy" must be a sort key, [key, ascending] tuple, or an array of those values.'
    );
  }
  if (value.length === 0) {
    return ["default"];
  }
  value.forEach(checkSortBy);
  return value as SortByValue[];
}

function sortByOptionToString(sortBy: SortByValue): string {
  if (Array.isArray(sortBy)) {
    return `${sortBy[0]} ${sortBy[1] ? "ASC" : "DESC"}`;
  }
  return `${sortBy} DESC`;
}

function normalizeAvailability(
  value: unknown
): AssetAvailabilityFilter {
  const availability = value ?? "all";
  if (
    typeof availability !== "string" ||
    !AVAILABILITY_FILTERS.includes(
      availability as AssetAvailabilityFilter
    )
  ) {
    throw new Error(
      `Option "availability" must be one of: ${AVAILABILITY_FILTERS.join(", ")}.`
    );
  }
  return availability as AssetAvailabilityFilter;
}

function normalizeArtwork(value: unknown): ArtworkQueryMode {
  const artwork = value ?? "legacy";
  if (
    typeof artwork !== "string" ||
    !ARTWORK_MODES.includes(artwork as ArtworkQueryMode)
  ) {
    throw new Error(
      `Option "artwork" must be one of: ${ARTWORK_MODES.join(", ")}.`
    );
  }
  return artwork as ArtworkQueryMode;
}

function processAssetsOptions(options: AssetsOptions = {}) {
  if (!isRecord(options)) {
    throw new Error("Asset query options must be an object.");
  }

  const createdAfter = normalizeDate(options.createdAfter, "createdAfter");
  const createdBefore = normalizeDate(options.createdBefore, "createdBefore");
  if (
    createdAfter != null &&
    createdBefore != null &&
    createdAfter > createdBefore
  ) {
    throw new Error(
      'Option "createdAfter" must be earlier than or equal to "createdBefore".'
    );
  }

  return {
    first: normalizeFirst(options.first),
    after: normalizeCursor(options.after),
    album: getId(options.album, "album"),
    artist: getId(options.artist, "artist"),
    genre: getId(options.genre, "genre"),
    sortBy: normalizeSortBy(options.sortBy).map(sortByOptionToString),
    createdAfter,
    createdBefore,
    availability: normalizeAvailability(options.availability),
    artwork: normalizeArtwork(options.artwork),
  };
}

function processSubQueryOptions(options: SubQueryOptions = {}) {
  if (!isRecord(options)) {
    throw new Error("Subquery options must be an object.");
  }
  return {
    first: normalizeFirst(options.first),
    after: normalizeCursor(options.after),
    sortBy: normalizeSortBy(options.sortBy).map(sortByOptionToString),
    availability: normalizeAvailability(options.availability),
    artwork: normalizeArtwork(options.artwork),
  };
}

type NativeMethod = (...args: any[]) => any;

function requireNativeMethod<T extends NativeMethod>(methodName: string): T {
  const method = ExpoMusicLibrary?.[methodName];
  if (typeof method !== "function") {
    throw new UnavailabilityError("ExpoMusicLibrary", methodName);
  }
  return method.bind(ExpoMusicLibrary) as T;
}

/**
 * Possible media types. The fallback keeps package imports safe on unsupported
 * platforms and when the Android native module omits the constant.
 */
export const MediaType: MediaTypeObject = Object.freeze({
  audio: "audio",
});

/**
 * Supported keys that can be used to sort asset queries.
 */
export const SortBy: SortByObject = Object.freeze({
  default: "default",
  creationTime: "creationTime",
  modificationTime: "modificationTime",
  duration: "duration",
  title: "title",
  artist: "artist",
  album: "album",
});

/**
 * Returns whether the native Music Library API is available on this device.
 */
export async function isAvailableAsync(): Promise<boolean> {
  return (
    ExpoMusicLibrary != null &&
    typeof ExpoMusicLibrary.getAssetsAsync === "function"
  );
}

/**
 * Asks the user to grant permissions for accessing media in user's media library.
 * `writeOnly` is retained for API compatibility; this read-only module does not
 * expose music-library writes.
 * @return A promise that fulfils with [`PermissionResponse`](#permissionresponse) object.
 */
export async function requestPermissionsAsync(
  writeOnly: boolean = false
): Promise<PermissionResponse> {
  if (typeof writeOnly !== "boolean") {
    throw new Error('Argument "writeOnly" must be a boolean.');
  }
  return await requireNativeMethod("requestPermissionsAsync")(writeOnly);
}

/**
 * Checks user's permissions for accessing media library.
 * `writeOnly` is retained for API compatibility; this read-only module does not
 * expose music-library writes.
 * @return A promise that fulfils with [`PermissionResponse`](#permissionresponse) object.
 */
export async function getPermissionsAsync(
  writeOnly: boolean = false
): Promise<PermissionResponse> {
  if (typeof writeOnly !== "boolean") {
    throw new Error('Argument "writeOnly" must be a boolean.');
  }
  return await requireNativeMethod("getPermissionsAsync")(writeOnly);
}

/**
 * Describes platform-specific collection, cloud-item, DRM, and URI support.
 */
export async function getCapabilitiesAsync(): Promise<MusicLibraryCapabilities> {
  return await requireNativeMethod("getCapabilitiesAsync")();
}

export async function getFoldersAsync(): Promise<Folder[]> {
  return await requireNativeMethod("getFoldersAsync")();
}

export async function getFolderAssetsAsync(
  folderId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  return await requireNativeMethod("getFolderAssetsAsync")(
    requireId(folderId, "folderId"),
    processSubQueryOptions(options)
  );
}

export async function getAlbumsAsync(): Promise<Album[]> {
  return await requireNativeMethod("getAlbumsAsync")();
}

export async function getAlbumAssetsAsync(
  albumId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  return await requireNativeMethod("getAlbumAssetsAsync")(
    requireId(albumId, "albumId"),
    processSubQueryOptions(options)
  );
}

export async function getArtistsAsync(): Promise<Artist[]> {
  return await requireNativeMethod("getArtistsAsync")();
}

export async function getArtistAssetsAsync(
  artistId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  return await requireNativeMethod("getArtistAssetsAsync")(
    requireId(artistId, "artistId"),
    processSubQueryOptions(options)
  );
}

export async function getGenresAsync(): Promise<Genre[]> {
  return await requireNativeMethod("getGenresAsync")();
}

export async function getGenreAssetsAsync(
  genreId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  return await requireNativeMethod("getGenreAssetsAsync")(
    requireId(genreId, "genreId"),
    processSubQueryOptions(options)
  );
}

export async function getAssetsAsync(
  assetsOptions: AssetsOptions = {}
): Promise<PagedInfo<Asset>> {
  return await requireNativeMethod("getAssetsAsync")(
    processAssetsOptions(assetsOptions)
  );
}

/**
 * Gets a single asset by its ID.
 * @param id The asset ID to look up.
 * @return A promise that fulfils with an [`Asset`](#asset) object.
 */
export async function getAssetByIdAsync(id: string): Promise<Asset> {
  return await requireNativeMethod("getAssetByIdAsync")(
    requireId(id, "id")
  );
}

/**
 * Searches for audio assets whose title, artist, or album match the query string.
 * @param query The search string.
 * @param options Optional pagination and filter options.
 * @return A promise that fulfils with a [`PagedInfo<Asset>`](#pagedinfo) object.
 */
export async function searchAssetsAsync(
  query: string,
  options: AssetsOptions = {}
): Promise<PagedInfo<Asset>> {
  if (typeof query !== "string" || query.trim().length === 0) {
    throw new Error('Search "query" must be a non-empty string.');
  }
  return await requireNativeMethod("searchAssetsAsync")(
    query.trim(),
    processAssetsOptions(options)
  );
}

/**
 * Subscribes to coarse library-change notifications. Events do not contain a
 * diff; reload the relevant query when `requiresFullReload` is true.
 */
export function addChangeListener(
  listener: (event: ChangeEventPayload) => void
) {
  if (typeof listener !== "function") {
    throw new Error('Argument "listener" must be a function.');
  }
  return requireNativeMethod("addListener")("onChange", listener);
}

export type { ChangeEventPayload };
