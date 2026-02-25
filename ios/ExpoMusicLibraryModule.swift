import ExpoModulesCore
import PhotosUI
import MediaPlayer

public class MusicLibraryModule: Module, MusicLibraryObserverHandler {
  private var writeOnly = false
  private var changeDelegate: MusicLibraryObserver?

  func didChange() {
    sendEvent("onChange", [
      "hasIncrementalChanges": true
    ])
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoMusicLibrary")

    Events("onChange")

    Constants {
      [
        "MediaType": [
          "audio": "audio",
        ],
        "SortBy": [
          "default": "default",
          "creationTime": "creationTime",
          "modificationTime": "modificationTime",
          "duration": "duration",
          "title": "title",
          "artist": "artist",
          "album": "album"
        ],
        "CHANGE_LISTENER_NAME": "onChange"
      ]
    }

    OnCreate {
      appContext?.permissions?.register([
        MusicLibraryPermissionRequester(),
        MusicLibraryWriteOnlyPermissionRequester()
      ])
    }

    AsyncFunction("getPermissionsAsync") { (writeOnly: Bool, promise: Promise) in
      self.writeOnly = writeOnly
      let status = MPMediaLibrary.authorizationStatus()
      let photoStatus = PHPhotoLibrary.authorizationStatus()

      var permissionStatus: String
      var granted = false

      switch status {
      case .authorized:
        permissionStatus = "granted"
        granted = true
      case .denied, .restricted:
        permissionStatus = "denied"
      case .notDetermined:
        permissionStatus = "undetermined"
      @unknown default:
        permissionStatus = "undetermined"
      }

      let result: [String: Any] = [
        "status": permissionStatus,
        "granted": granted,
        "canAccessAllFiles": granted,
        "accessPrivileges": granted ? "all" : "none",
        "artworkAccess": photoStatus == .authorized
      ]

      promise.resolve(result)
    }

    AsyncFunction("requestPermissionsAsync") { [weak self] (writeOnly: Bool, promise: Promise) in
      guard let self = self else {
        promise.reject("E_SELF_DEALLOCATED", "Self was deallocated.")
        return
      }

      self.writeOnly = writeOnly

      MPMediaLibrary.requestAuthorization { status in
        DispatchQueue.main.async {
          PHPhotoLibrary.requestAuthorization { photoStatus in
            DispatchQueue.main.async {
              var permissionStatus: String
              var granted = false

              switch status {
              case .authorized:
                permissionStatus = "granted"
                granted = true
              case .denied, .restricted:
                permissionStatus = "denied"
              case .notDetermined:
                permissionStatus = "undetermined"
              @unknown default:
                permissionStatus = "undetermined"
              }

              let result: [String: Any] = [
                "status": permissionStatus,
                "granted": granted,
                "canAccessAllFiles": granted,
                "accessPrivileges": granted ? "all" : "none",
                "artworkAccess": photoStatus == .authorized
              ]

              promise.resolve(result)
            }
          }
        }
      }
    }

    AsyncFunction("getFoldersAsync") { (promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.playlists()
      let collections = query.collections ?? []
      let folders = collections.map { playlist -> [String: Any] in
        return [
          "id": "\(playlist.persistentID)",
          "title": playlist.value(forProperty: MPMediaPlaylistPropertyName) as? String ?? "Unknown Playlist",
          "assetCount": playlist.count
        ]
      }
      promise.resolve(folders)
    }

    AsyncFunction("getFolderAssetsAsync") { (folderId: String, options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.songs()
      if let folderIdUInt = UInt64(folderId) {
        let predicate = MPMediaPropertyPredicate(value: folderIdUInt, forProperty: MPMediaPlaylistPropertyPersistentID)
        query.addFilterPredicate(predicate)
      }

      guard var items = query.items else {
        promise.resolve(emptyPagedResult())
        return
      }

      let sortByArray = options?["sortBy"] as? [String] ?? []
      if !sortByArray.isEmpty { items = sortMPMediaItems(items, by: sortByArray) }

      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      promise.resolve(paginateItems(items, first: first, after: after))
    }

    AsyncFunction("getAlbumsAsync") { (promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.albums()
      guard let collections = query.collections else {
        promise.resolve([])
        return
      }

      let albums = collections.map { album -> [String: Any] in
        return [
          "id": "\(album.persistentID)",
          "title": album.representativeItem?.albumTitle ?? "Unknown Album",
          "assetCount": album.count,
          "albumSongs": album.count,
          "artist": album.representativeItem?.artist ?? "Unknown Artist",
          "artwork": getArtwork(album.representativeItem) ?? ""
        ]
      }
      promise.resolve(albums)
    }

    AsyncFunction("getAlbumAssetsAsync") { (albumId: String, options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.songs()
      if let albumIdUInt = UInt64(albumId) {
        let predicate = MPMediaPropertyPredicate(value: albumIdUInt, forProperty: MPMediaItemPropertyAlbumPersistentID)
        query.addFilterPredicate(predicate)
      }

      guard var items = query.items else {
        promise.resolve(emptyPagedResult())
        return
      }

      let sortByArray = options?["sortBy"] as? [String] ?? []
      if !sortByArray.isEmpty { items = sortMPMediaItems(items, by: sortByArray) }

      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      promise.resolve(paginateItems(items, first: first, after: after))
    }

    AsyncFunction("getArtistsAsync") { (promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.artists()
      guard let collections = query.collections else {
        promise.resolve([])
        return
      }

      let artists = collections.map { artist -> [String: Any] in
        return [
          "id": "\(artist.persistentID)",
          "title": artist.representativeItem?.artist ?? "Unknown Artist",
          "assetCount": artist.count,
          "albumSongs": artist.count
        ]
      }
      promise.resolve(artists)
    }

    AsyncFunction("getArtistAssetsAsync") { (artistId: String, options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.songs()
      if let artistIdUInt = UInt64(artistId) {
        let predicate = MPMediaPropertyPredicate(value: artistIdUInt, forProperty: MPMediaItemPropertyArtistPersistentID)
        query.addFilterPredicate(predicate)
      }

      guard var items = query.items else {
        promise.resolve(emptyPagedResult())
        return
      }

      let sortByArray = options?["sortBy"] as? [String] ?? []
      if !sortByArray.isEmpty { items = sortMPMediaItems(items, by: sortByArray) }

      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      promise.resolve(paginateItems(items, first: first, after: after))
    }

    AsyncFunction("getGenresAsync") { (promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.genres()
      guard let collections = query.collections else {
        promise.resolve([])
        return
      }

      let genres = collections.map { genre -> [String: Any] in
        return [
          "id": "\(genre.persistentID)",
          "title": genre.representativeItem?.genre ?? "Unknown Genre",
          "assetCount": genre.count
        ]
      }
      promise.resolve(genres)
    }

    AsyncFunction("getGenreAssetsAsync") { (genreId: String, options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.songs()
      if let genreIdUInt = UInt64(genreId) {
        let predicate = MPMediaPropertyPredicate(value: genreIdUInt, forProperty: MPMediaItemPropertyGenrePersistentID)
        query.addFilterPredicate(predicate)
      }

      guard var items = query.items else {
        promise.resolve(emptyPagedResult())
        return
      }

      let sortByArray = options?["sortBy"] as? [String] ?? []
      if !sortByArray.isEmpty { items = sortMPMediaItems(items, by: sortByArray) }

      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      promise.resolve(paginateItems(items, first: first, after: after))
    }

    AsyncFunction("getAssetsAsync") { (options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.songs()

      // Album filter
      if let albumRef = options?["album"] as? String,
         let albumIdUInt = UInt64(albumRef) {
        let predicate = MPMediaPropertyPredicate(value: albumIdUInt, forProperty: MPMediaItemPropertyAlbumPersistentID)
        query.addFilterPredicate(predicate)
      }

      // Artist filter
      if let artistRef = options?["artist"] as? String,
         let artistIdUInt = UInt64(artistRef) {
        let predicate = MPMediaPropertyPredicate(value: artistIdUInt, forProperty: MPMediaItemPropertyArtistPersistentID)
        query.addFilterPredicate(predicate)
      }

      // Genre filter
      if let genreRef = options?["genre"] as? String,
         let genreIdUInt = UInt64(genreRef) {
        let predicate = MPMediaPropertyPredicate(value: genreIdUInt, forProperty: MPMediaItemPropertyGenrePersistentID)
        query.addFilterPredicate(predicate)
      }

      guard var items = query.items else {
        promise.resolve(emptyPagedResult())
        return
      }

      // Sorting
      if let sortByArray = options?["sortBy"] as? [String], !sortByArray.isEmpty {
        items = sortMPMediaItems(items, by: sortByArray)
      }

      // Date filters
      if let createdAfter = options?["createdAfter"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdAfter / 1000)
        items = items.filter { $0.dateAdded >= date }
      }
      if let createdBefore = options?["createdBefore"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdBefore / 1000)
        items = items.filter { $0.dateAdded <= date }
      }

      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      promise.resolve(paginateItems(items, first: first, after: after))
    }

    AsyncFunction("getAssetByIdAsync") { (assetId: String, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      guard let id = UInt64(assetId),
            let item = getMPMediaItemBy(persistentID: id) else {
        promise.reject("E_ASSET_NOT_FOUND", "Asset with id \(assetId) not found.")
        return
      }

      promise.resolve(formatSongFromMediaItem(item))
    }

    AsyncFunction("searchAssetsAsync") { (searchQuery: String, options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }

      let query = MPMediaQuery.songs()
      guard var items = query.items else {
        promise.resolve(emptyPagedResult())
        return
      }

      // Filter by search query across title, artist, and album
      let lowerQuery = searchQuery.lowercased()
      items = items.filter { item in
        let titleMatch = item.title?.lowercased().contains(lowerQuery) ?? false
        let artistMatch = item.artist?.lowercased().contains(lowerQuery) ?? false
        let albumMatch = item.albumTitle?.lowercased().contains(lowerQuery) ?? false
        return titleMatch || artistMatch || albumMatch
      }

      // Date filters
      if let createdAfter = options?["createdAfter"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdAfter / 1000)
        items = items.filter { $0.dateAdded >= date }
      }
      if let createdBefore = options?["createdBefore"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdBefore / 1000)
        items = items.filter { $0.dateAdded <= date }
      }

      // Sorting
      if let sortByArray = options?["sortBy"] as? [String], !sortByArray.isEmpty {
        items = sortMPMediaItems(items, by: sortByArray)
      }

      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      promise.resolve(paginateItems(items, first: first, after: after))
    }

    OnStartObserving {
      let delegate = MusicLibraryObserver(handler: self)
      self.changeDelegate = delegate
    }

    OnStopObserving {
      self.changeDelegate = nil
    }
  }

  // MARK: - Shared helpers

  private func paginateItems(_ items: [MPMediaItem], first: Int, after: String?) -> [String: Any] {
    var startIndex = 0
    if let after = after, let afterId = UInt64(after) {
      if let foundIndex = items.firstIndex(where: { $0.persistentID == afterId }) {
        startIndex = foundIndex + 1
      }
    }

    let endIndex = min(startIndex + first, items.count)
    let paginatedItems = startIndex < items.count ? Array(items[startIndex..<endIndex]) : []
    let assets = paginatedItems.map { formatSongFromMediaItem($0) }
    let endCursor = paginatedItems.last.map { "\($0.persistentID)" } ?? after ?? ""

    return [
      "assets": assets,
      "endCursor": endCursor,
      "hasNextPage": endIndex < items.count,
      "totalCount": items.count
    ]
  }

  private func emptyPagedResult() -> [String: Any] {
    return ["assets": [], "endCursor": "", "hasNextPage": false, "totalCount": 0]
  }

  private func checkPermissions(promise: Promise) -> Bool {
    if MPMediaLibrary.authorizationStatus() != .authorized {
      promise.reject(MusicLibraryPermissionsException())
      return false
    }
    return true
  }
}
