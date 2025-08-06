import Foundation
import Photos
import ExpoModulesCore
import MediaPlayer

// MARK: - Music Library Helper Functions

func formatSongFromMediaItem(_ item: MPMediaItem) -> [String: Any] {
  return [
    "id": "\(item.persistentID)",
    "filename": item.title ?? "Unknown Title", // Note: Actual filename not available from MPMediaItem
    "title": item.title ?? "Unknown Title",
    "artist": item.artist ?? "Unknown Artist",
    "artwork": getArtwork(item) ?? "",
    "uri": item.assetURL?.absoluteString ?? "",
    "mediaType": "audio",
    "width": 0, // Audio files don't have dimensions
    "height": 0,
    "creationTime": (item.dateAdded.timeIntervalSince1970 * 1000), // Convert to milliseconds
    "modificationTime": ((item.lastPlayedDate ?? item.dateAdded).timeIntervalSince1970 * 1000),
    "duration": item.playbackDuration,
    "albumId": "\(item.albumPersistentID)",
    "artistId": "\(item.artistPersistentID)",
    "genreId": "\(item.genrePersistentID)"
  ]
}

func getArtwork(_ item: MPMediaItem?) -> String? {
  guard let item = item, let artwork = item.artwork else {
    return ""
  }
  
  // Check if we have photo library permission for artwork access
  let photoPermissionGranted = PHPhotoLibrary.authorizationStatus() == .authorized
  
  let artworkImage = artwork.image(at: CGSize(width: 300, height: 300))
  
  if let artworkData = artworkImage?.jpegData(compressionQuality: 0.8) {
    return artworkData.base64EncodedString()
  } else {
    // If artwork access fails (permission issue), return empty string
    print("Artwork access failed")
    if !photoPermissionGranted {
      print("Photo library permission may be required for this artwork")
    }
    return ""
  }
}

// Alternative artwork function that returns URI instead of base64
func getArtworkURI(_ item: MPMediaItem?) -> String? {
  guard let item = item, item.artwork != nil else {
    return nil
  }
  
  // Return custom URI for image loader
  return "music-artwork://\(item.persistentID)"
}

// MARK: - Music Library Specific Functions

func getMPMediaItemBy(persistentID: UInt64) -> MPMediaItem? {
  let query = MPMediaQuery.songs()
  let predicate = MPMediaPropertyPredicate(
    value: NSNumber(value: persistentID),
    forProperty: MPMediaItemPropertyPersistentID
  )
  query.addFilterPredicate(predicate)
  
  return query.items?.first
}

func getMPMediaItemsBy(persistentIDs: [UInt64]) -> [MPMediaItem] {
  let query = MPMediaQuery.songs()
  let numbers = persistentIDs.map { NSNumber(value: $0) }
  let predicate = MPMediaPropertyPredicate(
    value: numbers,
    forProperty: MPMediaItemPropertyPersistentID
  )
  query.addFilterPredicate(predicate)
  
  return query.items ?? []
}

// MARK: - Permission Helper

func checkMusicLibraryPermission() throws {
  if MPMediaLibrary.authorizationStatus() != .authorized {
    throw MusicLibraryPermissionsException()
  }
}

// MARK: - Date/Time Utilities

func exportDate(_ date: Date?) -> Double? {
  if let date = date {
    let interval = date.timeIntervalSince1970
    return interval * 1000 // Convert to milliseconds
  }
  return nil
}

// MARK: - Extensions for MPMediaItem Collections

extension MPMediaItemCollection {
  func formatAsAlbum() -> [String: Any] {
    let representativeItem = self.representativeItem
    return [
      "id": "\(self.persistentID)",
      "title": representativeItem?.albumTitle ?? "Unknown Album",
      "assetCount": self.count,
      "albumSongs": self.count,
      "artist": representativeItem?.artist ?? "Unknown Artist",
      "artwork": getArtwork(representativeItem) ?? ""
    ]
  }
  
  func formatAsArtist() -> [String: Any] {
    let representativeItem = self.representativeItem
    return [
      "id": "\(self.persistentID)",
      "title": representativeItem?.artist ?? "Unknown Artist",
      "assetCount": self.count,
      "albumSongs": self.count
    ]
  }
  
  func formatAsGenre() -> [String: Any] {
    let representativeItem = self.representativeItem
    return [
      "id": "\(self.persistentID)",
      "title": representativeItem?.genre ?? "Unknown Genre"
    ]
  }
  
  func formatAsPlaylist() -> [String: Any] {
    return [
      "id": "\(self.persistentID)",
      "title": self.value(forProperty: MPMediaPlaylistPropertyName) as? String ?? "Unknown Playlist"
    ]
  }
}

// MARK: - Validation Helpers

func validatePersistentID(_ idString: String?) -> UInt64? {
  guard let idString = idString, let id = UInt64(idString), id > 0 else {
    return nil
  }
  return id
}

func validatePaginationOptions(first: Int?, after: String?) throws {
  if let first = first {
    if first <= 0 {
      throw InvalidPaginationException()
    }
    if first > 1000 {
      throw InvalidPaginationException()
    }
  }
  
  if let after = after {
    if validatePersistentID(after) == nil {
      throw CursorException()
    }
  }
}

// MARK: - Permission Requester Helper

func musicLibraryRequesterClass(_ writeOnly: Bool) -> EXPermissionsRequester.Type {
  if writeOnly {
    return MusicLibraryWriteOnlyPermissionRequester.self
  }
  return MusicLibraryPermissionRequester.self
}

// MARK: - Sorting Helpers for Music Library

func sortMPMediaItems(_ items: [MPMediaItem], by sortBy: [String]) -> [MPMediaItem] {
  var sortedItems = items
  
  for sortString in sortBy.reversed() { // Apply sorts in reverse order for proper precedence
    let components = sortString.components(separatedBy: " ")
    let key = components[0]
    let ascending = components.count > 1 && components[1] == "ASC"
    
    switch key {
    case "creationTime":
      sortedItems.sort { item1, item2 in
        return ascending ? item1.dateAdded < item2.dateAdded : item1.dateAdded > item2.dateAdded
      }
    case "modificationTime":
      sortedItems.sort { item1, item2 in
        let date1 = item1.lastPlayedDate ?? Date(timeIntervalSince1970: 0)
        let date2 = item2.lastPlayedDate ?? Date(timeIntervalSince1970: 0)
        return ascending ? date1 < date2 : date1 > date2
      }
    case "duration":
      sortedItems.sort { item1, item2 in
        return ascending ? item1.playbackDuration < item2.playbackDuration : item1.playbackDuration > item2.playbackDuration
      }
    case "title":
      sortedItems.sort { item1, item2 in
        let title1 = item1.title ?? ""
        let title2 = item2.title ?? ""
        return ascending ? title1 < title2 : title1 > title2
      }
    case "artist":
      sortedItems.sort { item1, item2 in
        let artist1 = item1.artist ?? ""
        let artist2 = item2.artist ?? ""
        return ascending ? artist1 < artist2 : artist1 > artist2
      }
    default:
      break // Unknown sort key, skip
    }
  }
  
  return sortedItems
}

// MARK: - Pagination Helpers

func paginateMPMediaItems(
  _ items: [MPMediaItem],
  first: Int,
  after: String?
) -> (assets: [[String: Any]], hasNextPage: Bool, totalCount: Int) {
  let totalCount = items.count
  let pageSize = min(first, totalCount)
  
  var startIndex = 0
  if let after = after, let afterId = validatePersistentID(after) {
    if let foundIndex = items.firstIndex(where: { $0.persistentID == afterId }) {
      startIndex = foundIndex + 1
    }
  }
  
  let endIndex = min(startIndex + pageSize, totalCount)
  let pageItems = startIndex < totalCount ? Array(items[startIndex..<endIndex]) : []
  
  let assets = pageItems.map { formatSongFromMediaItem($0) }
  let hasNextPage = endIndex < totalCount
  
  return (assets: assets, hasNextPage: hasNextPage, totalCount: totalCount)
}

// MARK: - Filter Helpers

func filterMPMediaItemsByDateRange(
  _ items: [MPMediaItem],
  createdAfter: Double? = nil,
  createdBefore: Double? = nil
) -> [MPMediaItem] {
  var filteredItems = items
  
  if let createdAfter = createdAfter {
    let afterDate = Date(timeIntervalSince1970: createdAfter / 1000)
    filteredItems = filteredItems.filter { $0.dateAdded >= afterDate }
  }
  
  if let createdBefore = createdBefore {
    let beforeDate = Date(timeIntervalSince1970: createdBefore / 1000)
    filteredItems = filteredItems.filter { $0.dateAdded <= beforeDate }
  }
  
  return filteredItems
}

// MARK: - REMOVED: Photo Library Functions
// All the PHAsset, PHAssetCollection, and Photos-related functions have been removed
// as they're not relevant for a music library module. These included:
// - stringify(mediaType:)
// - stringifyMedia(mediaSubtypes:)
// - stringifyAlbumType(type:)
// - exportAsset, exportAssetInfo
// - exportLocation, assetUriForLocalId
// - All PHAsset and PHAssetCollection related functions
// - Photo album creation/management functions

// If you need Photos functionality, that should be in a separate Photos module
