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
  | "duration";
export type SortByValue = [SortByKey, boolean] | SortByKey;

export type MediaTypeObject = {
  audio: "audio";
};

export type SortByObject = {
  default: "default";
  creationTime: "creationTime";
  modificationTime: "modificationTime";
  duration: "duration";
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

export type AlbumType = "album" | "moment" | "smartAlbum";

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
   * The type of the asset's album.
   * @platform ios
   */
  type?: AlbumType;
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

function getId(ref: any): string | undefined {
  if (typeof ref === "string") {
    return ref;
  }
  return ref ? ref.id : undefined;
}

function checkMediaType(mediaType: any): void {
  if (Object.values(MediaType).indexOf(mediaType) === -1) {
    throw new Error(`Invalid mediaType: ${mediaType}`);
  }
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

export async function getFolderAssetsAsync(folderId: string): Promise<Asset[]> {
  if (!ExpoMusicLibrary.getFolderAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getFolderAssetsAsync");
  }
  return await ExpoMusicLibrary.getFolderAssetsAsync(folderId);
}

export async function getAlbumsAsync(): Promise<Album[]> {
  if (!ExpoMusicLibrary.getAlbumsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAlbumsAsync");
  }
  return await ExpoMusicLibrary.getAlbumsAsync();
}

export async function getAlbumAssetsAsync(albumName: string): Promise<Asset[]> {
  if (!ExpoMusicLibrary.getAlbumAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAlbumAssetsAsync");
  }
  return await ExpoMusicLibrary.getAlbumAssetsAsync(albumName);
}

export async function getArtistsAsync(): Promise<Artist[]> {
  if (!ExpoMusicLibrary.getArtistsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getArtistsAsync");
  }
  return await ExpoMusicLibrary.getArtistsAsync();
}

export async function getArtistAssetsAsync(artistId: string): Promise<Asset[]> {
  if (!ExpoMusicLibrary.getArtistAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getArtistAssetsAsync");
  }
  return await ExpoMusicLibrary.getArtistAssetsAsync(artistId);
}

export async function getGenresAsync(): Promise<Genre[]> {
  if (!ExpoMusicLibrary.getGenresAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getGenresAsync");
  }
  return await ExpoMusicLibrary.getGenresAsync();
}

export async function getGenreAssetsAsync(genreId: string): Promise<Asset[]> {
  if (!ExpoMusicLibrary.getGenreAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getGenreAssetsAsync");
  }
  return await ExpoMusicLibrary.getGenreAssetsAsync(genreId);
}

export async function getAssetsAsync(
  assetsOptions: AssetsOptions = {}
): Promise<PagedInfo<Asset>> {
  if (!ExpoMusicLibrary.getAssetsAsync) {
    throw new UnavailabilityError("ExpoMusicLibrary", "getAssetsAsync");
  }

  const { first, after, album, sortBy, createdAfter, createdBefore } =
    assetsOptions;

  const options = {
    first: first == null ? 20 : first,
    after: getId(after),
    album: getId(album),
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
