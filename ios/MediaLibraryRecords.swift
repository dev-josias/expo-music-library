import ExpoModulesCore
import Photos
import MediaPlayer

// UPDATED: MediaType enum for music library context
enum MediaType: String, Enumerable {
  case audio
  case photo  // Keep for compatibility, but won't be used in music context
  case video  // Keep for compatibility, but won't be used in music context
  case all
  case unknown

  func toPHMediaType() -> PHAssetMediaType {
    switch self {
    case .audio:
      return .audio
    case .photo:
      return .image
    case .video:
      return .video
    default:
      return .unknown
    }
  }
  
  // ADDED: Helper for music library context - most queries will be audio-only
  func isAudioType() -> Bool {
    return self == .audio || self == .all
  }
}

// Keep existing structures - they're fine for your use case
struct AlbumOptions: Record {
  @Field var includeSmartAlbums: Bool = false
}

struct AssetInfoOptions: Record {
  @Field var shouldDownloadFromNetwork: Bool = true
}

// UPDATED: Better documentation and validation
struct AssetWithOptions: Record {
  @Field var first: Int = 20           // Default page size
  @Field var after: String?            // Cursor for pagination (persistentID as string)
  @Field var album: String?            // Album persistentID as string
  @Field var sortBy: [String] = []     // e.g., ["duration DESC", "creationTime ASC"]
  @Field var mediaType: [MediaType] = [.audio]  // Default to audio only for music library
  @Field var createdAfter: Double?     // Timestamp in milliseconds
  @Field var createdBefore: Double?    // Timestamp in milliseconds
}

struct GetAssetsResponse {
  let assets: [[String: Any?]]
  let totalCount: Int
  let hasNextPage: Bool
}

// ADDED: Additional helpful structures for music library
struct Artist: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var assetCount: Int = 0
  @Field var albumSongs: Int = 0
}

struct Album: Record {
  @Field var id: String = ""
  @Field var title: String = ""
  @Field var assetCount: Int = 0
  @Field var albumSongs: Int = 0
  @Field var artist: String = ""
  @Field var artwork: String = ""
}

struct Genre: Record {
  @Field var id: String = ""
  @Field var title: String = ""
}

struct Folder: Record {
  @Field var id: String = ""
  @Field var title: String = ""
}

// ADDED: Music-specific asset structure to match your TypeScript interface
struct MusicAsset: Record {
  @Field var id: String = ""
  @Field var filename: String = ""
  @Field var title: String = ""
  @Field var artwork: String? = nil
  @Field var artist: String = ""
  @Field var uri: String = ""
  @Field var mediaType: String = "audio"
  @Field var width: Int = 0
  @Field var height: Int = 0
  @Field var creationTime: Double = 0
  @Field var modificationTime: Double = 0
  @Field var duration: Double = 0
  @Field var albumId: String? = nil
  @Field var artistId: String? = nil
  @Field var genreId: String? = nil
}

// ADDED: Helper extensions for working with MPMediaItem
extension MPMediaItem {
  func toMusicAsset() -> [String: Any] {
    return [
      "id": "\(self.persistentID)",
      "filename": self.title ?? "Unknown Title",
      "title": self.title ?? "Unknown Title",
      "artwork": getArtwork(self) ?? "",
      "artist": self.artist ?? "Unknown Artist",
      "uri": self.assetURL?.absoluteString ?? "",
      "mediaType": "audio",
      "width": 0,
      "height": 0,
      "creationTime": (self.dateAdded.timeIntervalSince1970 * 1000),
      "modificationTime": ((self.lastPlayedDate ?? self.dateAdded).timeIntervalSince1970 * 1000),
      "duration": self.playbackDuration,
      "albumId": "\(self.albumPersistentID)",
      "artistId": "\(self.artistPersistentID)",
      "genreId": "\(self.genrePersistentID)"
    ]
  }
}

// ADDED: Validation helpers
extension AssetWithOptions {
  func validate() throws {
    if first <= 0 {
      throw NSError(domain: "AssetWithOptions", code: 1, userInfo: [NSLocalizedDescriptionKey: "first must be greater than 0"])
    }
    
    if first > 1000 {
      throw NSError(domain: "AssetWithOptions", code: 2, userInfo: [NSLocalizedDescriptionKey: "first cannot exceed 1000 for performance reasons"])
    }
    
    // Validate sortBy format
    for sortString in sortBy {
      let components = sortString.components(separatedBy: " ")
      if components.isEmpty {
        throw NSError(domain: "AssetWithOptions", code: 3, userInfo: [NSLocalizedDescriptionKey: "Invalid sortBy format"])
      }
      
      let validKeys = ["default", "creationTime", "modificationTime", "duration"]
      if !validKeys.contains(components[0]) {
        throw NSError(domain: "AssetWithOptions", code: 4, userInfo: [NSLocalizedDescriptionKey: "Invalid sortBy key: \(components[0])"])
      }
    }
  }
}

// ADDED: Response builders
extension GetAssetsResponse {
  static func empty() -> GetAssetsResponse {
    return GetAssetsResponse(assets: [], totalCount: 0, hasNextPage: false)
  }
  
  static func from(items: [MPMediaItem], startIndex: Int, pageSize: Int) -> GetAssetsResponse {
    let totalCount = items.count
    let endIndex = min(startIndex + pageSize, totalCount)
    let pageItems = startIndex < totalCount ? Array(items[startIndex..<endIndex]) : []
    
    let assets = pageItems.map { $0.toMusicAsset() }
    let hasNextPage = endIndex < totalCount
    
    return GetAssetsResponse(assets: assets, totalCount: totalCount, hasNextPage: hasNextPage)
  }
}
