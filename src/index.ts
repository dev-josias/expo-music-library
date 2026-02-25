import {
  PermissionResponse as EXPermissionResponse,
  UnavailabilityError,
} from "expo-modules-core";
import { Platform } from "react-native";

import { ChangeEventPayload } from "./ExpoMusicLibrary.types";
import ExpoMusicLibrary from "./ExpoMusicLibraryModule";

export type PermissionResponse = EXPermissionResponse & {
  accessPrivileges?: "all" | "limited" | "none";
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
export type SortByValue = [SortByKey, boolean] | SortByKey;

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
   * Artwork of the audio file
   */
  artwork?: string;
  /**
   * Artist
   */
  artist: string;
  /**
   * URI that points to the asset. `assets://*` (iOS), `file://*` (Android)
   */
  uri: string;
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
};

export type AssetsOptions = {
  /**
   * The maximum number of items on a single page.
   * @default 20
   */
  first?: number;
  /**
   * Asset ID of the last item returned on the previous page. To get the ID of the next page,
   * pass [`endCursor`](#pagedinfo) as its value.
   */
  after?: AssetRef;
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
  sortBy?: SortByValue[] | SortByValue;
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
   * Cursor from the previous page's `endCursor`.
   */
  after?: string;
  /**
   * Sort order for results.
   */
  sortBy?: SortByValue[] | SortByValue;
};

export type PagedInfo<T> = {
  /**
   * A page of [`Asset`](#asset)s fetched by the query.
   */
  assets: T[];
  /**
   * ID of the last fetched asset. It should be passed as `after` option in order to get the
   * next page.
   */
  endCursor: string;
  /**
   * Whether there are more assets to fetch.
   */
  hasNextPage: boolean;
  /**
   * Estimated total number of assets that match the query.
   */
  totalCount: number;
};

// @docsMissing
export type AssetRef = Asset | string;

// @docsMissing
export type AlbumRef = Album | string;

// @docsMissing
export type ArtistRef = Artist | string;

// @docsMissing
export type GenreRef = Genre | string;

function getId(ref: any): string | undefined {
  if (typeof ref === "string") {
    return ref;
  }
  return ref ? ref.id : undefined;
}

function checkSortBy(sortBy: any): void {
  if (Array.isArray(sortBy)) {
    checkSortByKey(sortBy[0]);

    if (typeof sortBy[1] !== "boolean") {
      throw new Error(
        "Invalid sortBy array argument. Second item must be a boolean!"
      );
    }
  } else {
    checkSortByKey(sortBy);
  }
}

function checkSortByKey(sortBy: any): void {
  if (Object.values(SortBy).indexOf(sortBy) === -1) {
    throw new Error(`Invalid sortBy key: ${sortBy}`);
  }
}

function sortByOptionToString(sortBy: any) {
  if (Array.isArray(sortBy)) {
    return `${sortBy[0]} ${sortBy[1] ? "ASC" : "DESC"}`;
  }
  return `${sortBy} DESC`;
}

function dateToNumber(value?: Date | number): number | undefined {
  return value instanceof Date ? value.getTime() : value;
}

function arrayize(item: any): any[] {
  if (Array.isArray(item)) {
    return item;
  }
  return item ? [item] : [];
}

function processSubQueryOptions(options: SubQueryOptions): {
  first: number;
  after: string | null;
  sortBy: string[];
} {
  const { first, after, sortBy } = options;
  const sortByArray = sortBy ? arrayize(sortBy) : arrayize("default");
  sortByArray.forEach(checkSortBy);
  return {
    first: first == null ? 20 : first,
    after: after ?? null,
    sortBy: sortByArray.map(sortByOptionToString),
  };
}

// @needsAudit
/**
 * Possible media types.
 */
export const MediaType: MediaTypeObject = ExpoMusicLibrary.MediaType;

// @needsAudit
/**
 * Supported keys that can be used to sort `getAssetsAsync` results.
 */
export const SortBy: SortByObject = ExpoMusicLibrary.SortBy;

// @needsAudit
/**
 * Returns whether the Media Library API is enabled on the current device.
 * @return A promise which fulfils with a `boolean`, indicating whether the Media Library API is
 * available on the current device.
 */
export async function isAvailableAsync(): Promise<boolean> {
  return !!ExpoMusicLibrary && "getAssetsAsync" in ExpoMusicLibrary;
}

// @needsAudit @docsMissing
/**
 * Asks the user to grant permissions for accessing media in user's media library.
 * @param writeOnly
 * @return A promise that fulfils with [`PermissionResponse`](#permissionresponse) object.
 */
export async function requestPermissionsAsync(
  writeOnly: boolean = false
): Promise<PermissionResponse> {
  if (!ExpoMusicLibrary.requestPermissionsAsync) {
    throw new UnavailabilityError(
      "ExpoMusicLibrary",
      "requestPermissionsAsync"
    );
  }
  return await ExpoMusicLibrary.requestPermissionsAsync(writeOnly);
}

// @needsAudit @docsMissing
/**
 * Checks user's permissions for accessing media library.
 * @param writeOnly
 * @return A promise that fulfils with [`PermissionResponse`](#permissionresponse) object.
 */
export async function getPermissionsAsync(
  writeOnly: boolean = false
): Promise<PermissionResponse> {
  if (!ExpoMusicLibrary.getPermissionsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getPermissionsAsync");
  }
  return await ExpoMusicLibrary.getPermissionsAsync(writeOnly);
}

export async function getFoldersAsync(): Promise<Folder[]> {
  if (!ExpoMusicLibrary.getFoldersAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getFoldersAsync");
  }
  return await ExpoMusicLibrary.getFoldersAsync();
}

export async function getFolderAssetsAsync(
  folderId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  if (!ExpoMusicLibrary.getFolderAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getFolderAssetsAsync");
  }
  return await ExpoMusicLibrary.getFolderAssetsAsync(
    folderId,
    processSubQueryOptions(options)
  );
}

export async function getAlbumsAsync(): Promise<Album[]> {
  if (!ExpoMusicLibrary.getAlbumsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAlbumsAsync");
  }
  return await ExpoMusicLibrary.getAlbumsAsync();
}

export async function getAlbumAssetsAsync(
  albumName: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  if (!ExpoMusicLibrary.getAlbumAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAlbumAssetsAsync");
  }
  return await ExpoMusicLibrary.getAlbumAssetsAsync(
    albumName,
    processSubQueryOptions(options)
  );
}

export async function getArtistsAsync(): Promise<Artist[]> {
  if (!ExpoMusicLibrary.getArtistsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getArtistsAsync");
  }
  return await ExpoMusicLibrary.getArtistsAsync();
}

export async function getArtistAssetsAsync(
  artistId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  if (!ExpoMusicLibrary.getArtistAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getArtistAssetsAsync");
  }
  return await ExpoMusicLibrary.getArtistAssetsAsync(
    artistId,
    processSubQueryOptions(options)
  );
}

export async function getGenresAsync(): Promise<Genre[]> {
  if (!ExpoMusicLibrary.getGenresAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getGenresAsync");
  }
  return await ExpoMusicLibrary.getGenresAsync();
}

export async function getGenreAssetsAsync(
  genreId: string,
  options: SubQueryOptions = {}
): Promise<PagedInfo<Asset>> {
  if (!ExpoMusicLibrary.getGenreAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getGenreAssetsAsync");
  }
  return await ExpoMusicLibrary.getGenreAssetsAsync(
    genreId,
    processSubQueryOptions(options)
  );
}

export async function getAssetsAsync(
  assetsOptions: AssetsOptions = {}
): Promise<PagedInfo<Asset>> {
  if (!ExpoMusicLibrary.getAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAssetsAsync");
  }

  const { first, after, album, artist, genre, sortBy, createdAfter, createdBefore } =
    assetsOptions;

  const options = {
    first: first == null ? 20 : first,
    after: getId(after),
    album: getId(album),
    artist: getId(artist),
    genre: getId(genre),
    sortBy: sortBy ? arrayize(sortBy) : arrayize("default"),
    createdAfter: dateToNumber(createdAfter),
    createdBefore: dateToNumber(createdBefore),
  };

  if (first != null && typeof options.first !== "number") {
    throw new Error('Option "first" must be a number!');
  }
  if (after != null && typeof options.after !== "string") {
    throw new Error('Option "after" must be a string!');
  }
  if (album != null && typeof options.album !== "string") {
    throw new Error('Option "album" must be a string!');
  }

  if (
    after != null &&
    Platform.OS === "android" &&
    isNaN(parseInt(getId(after) as string, 10))
  ) {
    throw new Error('Option "after" must be a valid ID!');
  }

  if (first != null && first < 0) {
    throw new Error('Option "first" must be a positive integer!');
  }

  options.sortBy.forEach(checkSortBy);
  options.sortBy = options.sortBy.map(sortByOptionToString);

  return await ExpoMusicLibrary.getAssetsAsync(options);
}

/**
 * Gets a single asset by its ID.
 * @param id The asset ID to look up.
 * @return A promise that fulfils with an [`Asset`](#asset) object.
 */
export async function getAssetByIdAsync(id: string): Promise<Asset> {
  if (!ExpoMusicLibrary.getAssetByIdAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAssetByIdAsync");
  }
  return await ExpoMusicLibrary.getAssetByIdAsync(id);
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
  if (!ExpoMusicLibrary.searchAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "searchAssetsAsync");
  }

  if (!query || query.trim() === "") {
    throw new Error('Search "query" cannot be empty.');
  }

  const { first, after, album, artist, genre, sortBy, createdAfter, createdBefore } = options;

  const opts = {
    first: first == null ? 20 : first,
    after: getId(after),
    album: getId(album),
    artist: getId(artist),
    genre: getId(genre),
    sortBy: sortBy ? arrayize(sortBy) : arrayize("default"),
    createdAfter: dateToNumber(createdAfter),
    createdBefore: dateToNumber(createdBefore),
  };

  opts.sortBy.forEach(checkSortBy);
  opts.sortBy = opts.sortBy.map(sortByOptionToString);

  return await ExpoMusicLibrary.searchAssetsAsync(query, opts);
}

const emitter = ExpoMusicLibrary as {
  addListener: (
    eventName: "onChange",
    listener: (e: ChangeEventPayload) => void
  ) => { remove: () => void };
  removeAllListeners?: (eventName: string) => void;
};

export function addChangeListener(
  listener: (event: ChangeEventPayload) => void
) {
  return emitter.addListener("onChange", listener);
}

export { ChangeEventPayload };
