import Foundation
import MediaPlayer
import UIKit

enum MusicAssetAvailabilityFilter: String {
  case all
  case hasAssetUrl
  case avFoundationAccessible
}

enum MusicArtworkMode: String {
  case legacy
  case uri
  case none
}

private struct MusicSortDescriptor {
  let key: String
  let ascending: Bool
}

// MARK: - Asset serialization

func getArtworkURI(_ item: MPMediaItem?) -> String? {
  guard let item, item.persistentID > 0, item.artwork != nil else {
    return nil
  }
  return "music-artwork://\(item.persistentID)"
}

func getLegacyArtwork(_ item: MPMediaItem?) -> String? {
  guard let artwork = item?.artwork,
        let image = artwork.image(at: CGSize(width: 300, height: 300)),
        let data = image.jpegData(compressionQuality: 0.8) else {
    return nil
  }
  return data.base64EncodedString()
}

func isSupportedMusicItem(_ item: MPMediaItem) -> Bool {
  item.mediaType == .music
}

func uniqueSupportedMusicItems(_ items: [MPMediaItem]) -> [MPMediaItem] {
  var seen = Set<MPMediaEntityPersistentID>()
  return items.filter {
    isSupportedMusicItem($0) && seen.insert($0.persistentID).inserted
  }
}

func formatSongFromMediaItem(
  _ item: MPMediaItem,
  artworkMode: MusicArtworkMode = .legacy
) -> [String: Any] {
  let assetUrl = item.assetURL?.absoluteString
  let isCloudItem = item.isCloudItem
  let hasProtectedAsset = item.hasProtectedAsset
  let hasAssetUrl = assetUrl != nil
  let canAccessWithAVFoundation = hasAssetUrl && !hasProtectedAsset

  let availability: String
  let availabilityReason: Any
  if hasProtectedAsset {
    availability = "protected"
    availabilityReason = "protected"
  } else if canAccessWithAVFoundation {
    availability = "local"
    availabilityReason = NSNull()
  } else if isCloudItem {
    availability = "cloud"
    availabilityReason = "cloud"
  } else {
    availability = "unavailable"
    availabilityReason = "missingAssetUrl"
  }

  let artworkUri = artworkMode == .none ? nil : getArtworkURI(item)
  let artwork: String
  switch artworkMode {
  case .legacy:
    artwork = getLegacyArtwork(item) ?? ""
  case .uri:
    artwork = artworkUri ?? ""
  case .none:
    artwork = ""
  }
  let trackNumber: Any = item.albumTrackNumber > 0
    ? item.albumTrackNumber
    : NSNull()
  let discNumber: Any = item.discNumber > 0
    ? item.discNumber
    : NSNull()

  return [
    "id": "\(item.persistentID)",
    // MPMediaItem doesn't expose an original filename. Keep this legacy field
    // populated with the title for compatibility with earlier releases.
    "filename": item.title ?? "Unknown Title",
    "title": item.title ?? "Unknown Title",
    "artist": item.artist ?? "Unknown Artist",
    "artwork": artwork,
    "artworkUri": artworkUri ?? NSNull(),
    // Keep the legacy non-null string while exposing the truthful nullable URL.
    "uri": assetUrl ?? "",
    "assetUrl": assetUrl ?? NSNull(),
    "contentUri": NSNull(),
    "uriKind": hasAssetUrl ? "ipod-library" : "none",
    "availability": availability,
    "availabilityReason": availabilityReason,
    "isCloudItem": isCloudItem,
    "hasProtectedAsset": hasProtectedAsset,
    "hasAssetUrl": hasAssetUrl,
    "hasLocalAssetURL": hasAssetUrl,
    "canAccessWithAVFoundation": canAccessWithAVFoundation,
    "isLocallyAvailable": canAccessWithAVFoundation,
    "isPlayable": canAccessWithAVFoundation,
    "mediaType": "audio",
    "mimeType": NSNull(),
    "fileSize": NSNull(),
    "albumTitle": item.albumTitle ?? NSNull(),
    "trackNumber": trackNumber,
    "discNumber": discNumber,
    "width": 0,
    "height": 0,
    "creationTime": item.dateAdded.timeIntervalSince1970 * 1000,
    // MPMediaItem has no file-modification timestamp. Preserve the legacy
    // last-played fallback until this field can be renamed in a major release.
    "modificationTime": (item.lastPlayedDate ?? item.dateAdded).timeIntervalSince1970 * 1000,
    "duration": item.playbackDuration,
    "albumId": "\(item.albumPersistentID)",
    "artistId": "\(item.artistPersistentID)",
    "genreId": "\(item.genrePersistentID)"
  ]
}

func itemMatchesAvailability(
  _ item: MPMediaItem,
  filter: MusicAssetAvailabilityFilter
) -> Bool {
  switch filter {
  case .all:
    return true
  case .hasAssetUrl:
    return item.assetURL != nil
  case .avFoundationAccessible:
    return item.assetURL != nil && !item.hasProtectedAsset
  }
}

// MARK: - Media library lookup

func getMPMediaItemBy(persistentID: UInt64) -> MPMediaItem? {
  let query = MPMediaQuery.songs()
  let predicate = MPMediaPropertyPredicate(
    value: NSNumber(value: persistentID),
    forProperty: MPMediaItemPropertyPersistentID
  )
  query.addFilterPredicate(predicate)
  return query.items?.first
}

func getMPMediaPlaylistBy(persistentID: UInt64) -> MPMediaPlaylist? {
  let query = MPMediaQuery.playlists()
  let predicate = MPMediaPropertyPredicate(
    value: NSNumber(value: persistentID),
    forProperty: MPMediaPlaylistPropertyPersistentID
  )
  query.addFilterPredicate(predicate)
  return query.collections?.first as? MPMediaPlaylist
}

// MARK: - Collection serialization

extension MPMediaItemCollection {
  func formatAsAlbum() -> [String: Any] {
    let musicItems = uniqueSupportedMusicItems(items)
    let item = musicItems.first
    let artworkUri = getArtworkURI(item)
    return [
      "id": "\(persistentID)",
      "title": item?.albumTitle ?? "Unknown Album",
      "assetCount": musicItems.count,
      "albumSongs": musicItems.count,
      "artist": item?.artist ?? "Unknown Artist",
      "artwork": getLegacyArtwork(item) ?? "",
      "artworkUri": artworkUri ?? NSNull()
    ]
  }

  func formatAsArtist() -> [String: Any] {
    let musicItems = uniqueSupportedMusicItems(items)
    return [
      "id": "\(persistentID)",
      "title": musicItems.first?.artist ?? "Unknown Artist",
      "assetCount": musicItems.count,
      "albumSongs": musicItems.count
    ]
  }

  func formatAsGenre() -> [String: Any] {
    let musicItems = uniqueSupportedMusicItems(items)
    return [
      "id": "\(persistentID)",
      "title": musicItems.first?.genre ?? "Unknown Genre",
      "assetCount": musicItems.count
    ]
  }

  func formatAsPlaylist() -> [String: Any]? {
    let musicItems = uniqueSupportedMusicItems(items)
    guard !musicItems.isEmpty else {
      return nil
    }
    return [
      "id": "\(persistentID)",
      "title": value(forProperty: MPMediaPlaylistPropertyName) as? String ?? "Unknown Playlist",
      "assetCount": musicItems.count
    ]
  }
}

// MARK: - Deterministic sorting

func validateSortOptions(_ sortBy: [String]) -> Bool {
  sortBy.allSatisfy { parseSortDescriptor($0) != nil }
}

func sortMPMediaItems(_ items: [MPMediaItem], by sortBy: [String]) -> [MPMediaItem] {
  let descriptors = sortBy.compactMap(parseSortDescriptor).filter { $0.key != "default" }
  guard !descriptors.isEmpty else {
    return items
  }

  return items.sorted { lhs, rhs in
    for descriptor in descriptors {
      let comparison = compareMediaItems(lhs, rhs, key: descriptor.key)
      guard comparison != .orderedSame else {
        continue
      }
      return descriptor.ascending
        ? comparison == .orderedAscending
        : comparison == .orderedDescending
    }

    // A deterministic final key is required for cursor pagination when the
    // requested sort values are equal.
    return lhs.persistentID < rhs.persistentID
  }
}

private func parseSortDescriptor(_ rawValue: String) -> MusicSortDescriptor? {
  let components = rawValue
    .split(whereSeparator: \.isWhitespace)
    .map(String.init)

  guard components.count == 2 else {
    return nil
  }

  let validKeys = [
    "default",
    "creationTime",
    "modificationTime",
    "duration",
    "title",
    "artist",
    "album"
  ]
  guard validKeys.contains(components[0]) else {
    return nil
  }

  switch components[1].uppercased() {
  case "ASC":
    return MusicSortDescriptor(key: components[0], ascending: true)
  case "DESC":
    return MusicSortDescriptor(key: components[0], ascending: false)
  default:
    return nil
  }
}

private func compareMediaItems(
  _ lhs: MPMediaItem,
  _ rhs: MPMediaItem,
  key: String
) -> ComparisonResult {
  switch key {
  case "creationTime":
    return compare(lhs.dateAdded, rhs.dateAdded)
  case "modificationTime":
    return compare(
      lhs.lastPlayedDate ?? Date(timeIntervalSince1970: 0),
      rhs.lastPlayedDate ?? Date(timeIntervalSince1970: 0)
    )
  case "duration":
    return compare(lhs.playbackDuration, rhs.playbackDuration)
  case "title":
    return compare(lhs.title ?? "", rhs.title ?? "")
  case "artist":
    return compare(lhs.artist ?? "", rhs.artist ?? "")
  case "album":
    return compare(lhs.albumTitle ?? "", rhs.albumTitle ?? "")
  default:
    return .orderedSame
  }
}

private func compare<T: Comparable>(_ lhs: T, _ rhs: T) -> ComparisonResult {
  if lhs < rhs {
    return .orderedAscending
  }
  if lhs > rhs {
    return .orderedDescending
  }
  return .orderedSame
}

private func compare(_ lhs: String, _ rhs: String) -> ComparisonResult {
  lhs.localizedCaseInsensitiveCompare(rhs)
}
