import ExpoModulesCore
import PhotosUI
import MediaPlayer

public class MusicLibraryModule: Module, MusicLibraryObserverHandler {
  private var writeOnly = false
  private var changeDelegate: MusicLibraryObserver?
  
  func didChange() {
    sendEvent("musicLibraryDidChange", [
      "hasIncrementalChanges": true
    ])
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoMusicLibrary")

    Events("musicLibraryDidChange")

    Constants {
      [
        "MediaType": [
          "audio": "audio",
        ],
        "SortBy": [
          "default": "default",
          "creationTime": "creationTime",
          "modificationTime": "modificationTime",
          "duration": "duration"
        ],
        "CHANGE_LISTENER_NAME": "musicLibraryDidChange"
      ]
    }

    OnCreate {
      appContext?.permissions?.register([
        MusicLibraryPermissionRequester(),
        MusicLibraryWriteOnlyPermissionRequester()
      ])
    }

    // FIXED: Simplified permission checking using MPMediaLibrary directly
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

    // FIXED: Direct MPMediaLibrary permission request
    AsyncFunction("requestPermissionsAsync") { [weak self] (writeOnly: Bool, promise: Promise) in
      guard let self = self else {
        promise.reject("E_SELF_DEALLOCATED", "Self was deallocated.")
        return
      }

      self.writeOnly = writeOnly
      
      MPMediaLibrary.requestAuthorization { status in
        DispatchQueue.main.async {
          // Also request photo permission for artwork access
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

    // FIXED: Music files cannot be programmatically added to iOS Music Library
    AsyncFunction("createAssetAsync") { (uri: URL, promise: Promise) in
      // IMPORTANT: iOS does not allow apps to programmatically add files to the Music Library
      // This is a security restriction by Apple - users must manually import music through:
      // - iTunes/Music app
      // - Files app -> Share -> Add to Music
      // - Third-party apps with special entitlements
      
      promise.reject(
        "E_UNSUPPORTED_OPERATION",
        "iOS does not allow programmatic addition of music files to the Music Library. Users must import music manually through the Music app or Files app."
      )
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
          "title": playlist.value(forProperty: MPMediaPlaylistPropertyName) as? String ?? "Unknown Playlist"
        ]
      }
      promise.resolve(folders)
    }

    AsyncFunction("getFolderAssetsAsync") { (folderId: String, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }
      
      let query = MPMediaQuery.songs()
      if let folderIdUInt = UInt64(folderId) {
        let predicate = MPMediaPropertyPredicate(value: folderIdUInt, forProperty: MPMediaPlaylistPropertyPersistentID)
        query.addFilterPredicate(predicate)
      }
      
      guard let items = query.items else {
        promise.resolve([])
        return
      }
      
      let assets = items.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }
      promise.resolve(assets)
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

    AsyncFunction("getAlbumAssetsAsync") { (albumId: String, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }
      
      let query = MPMediaQuery.songs()
      if let albumIdUInt = UInt64(albumId) {
        let predicate = MPMediaPropertyPredicate(value: albumIdUInt, forProperty: MPMediaItemPropertyAlbumPersistentID)
        query.addFilterPredicate(predicate)
      }
      
      guard let items = query.items else {
        promise.resolve([])
        return
      }
      
      let assets = items.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }
      promise.resolve(assets)
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

    AsyncFunction("getArtistAssetsAsync") { (artistId: String, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }
      
      let query = MPMediaQuery.songs()
      if let artistIdUInt = UInt64(artistId) {
        let predicate = MPMediaPropertyPredicate(value: artistIdUInt, forProperty: MPMediaItemPropertyArtistPersistentID)
        query.addFilterPredicate(predicate)
      }

      guard let items = query.items else {
        promise.resolve([])
        return
      }

      let assets = items.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }
      promise.resolve(assets)
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
          "title": genre.representativeItem?.genre ?? "Unknown Genre"
        ]
      }
      promise.resolve(genres)
    }

    AsyncFunction("getGenreAssetsAsync") { (genreId: String, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }
      
      let query = MPMediaQuery.songs()
      if let genreIdUInt = UInt64(genreId) {
        let predicate = MPMediaPropertyPredicate(value: genreIdUInt, forProperty: MPMediaItemPropertyGenrePersistentID)
        query.addFilterPredicate(predicate)
      }

      guard let items = query.items else {
        promise.resolve([])
        return
      }

      let assets = items.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }
      promise.resolve(assets)
    }
    
    // FIXED: Complete rewrite of getAssetsAsync with proper pagination
    AsyncFunction("getAssetsAsync") { (options: [String: Any]?, promise: Promise) in
      if MPMediaLibrary.authorizationStatus() != .authorized {
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library permission required")
        return
      }
      
      let query = MPMediaQuery.songs()

      // Handle album filter
      if let albumRef = options?["album"] as? String,
         let albumIdUInt = UInt64(albumRef) {
        let albumPredicate = MPMediaPropertyPredicate(value: albumIdUInt, forProperty: MPMediaItemPropertyAlbumPersistentID)
        query.addFilterPredicate(albumPredicate)
      }

      guard var items = query.items else {
        let emptyResponse: [String: Any] = [
          "assets": [],
          "endCursor": "",
          "hasNextPage": false,
          "totalCount": 0
        ]
        promise.resolve(emptyResponse)
        return
      }

      // FIXED: Handle sorting properly - expecting array of strings like ["duration DESC", "creationTime ASC"]
      if let sortByArray = options?["sortBy"] as? [String] {
        for sortString in sortByArray {
          let components = sortString.components(separatedBy: " ")
          let key = components[0]
          let ascending = components.count > 1 && components[1] == "ASC"

          switch key {
          case "creationTime":
            items.sort { item1, item2 in
              return ascending ? item1.dateAdded < item2.dateAdded : item1.dateAdded > item2.dateAdded
            }
          case "modificationTime":
            items.sort { item1, item2 in
              let date1 = item1.lastPlayedDate ?? Date(timeIntervalSince1970: 0)
              let date2 = item2.lastPlayedDate ?? Date(timeIntervalSince1970: 0)
              return ascending ? date1 < date2 : date1 > date2
            }
          case "duration":
            items.sort { item1, item2 in
              return ascending ? item1.playbackDuration < item2.playbackDuration : item1.playbackDuration > item2.playbackDuration
            }
          default:
            break
          }
        }
      }

      // Handle date filters
      if let createdAfter = options?["createdAfter"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdAfter / 1000)
        items = items.filter { $0.dateAdded >= date }
      }

      if let createdBefore = options?["createdBefore"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdBefore / 1000)
        items = items.filter { $0.dateAdded <= date }
      }

      // FIXED: Handle pagination properly
      let first = options?["first"] as? Int ?? 20
      let after = options?["after"] as? String
      
      var startIndex = 0
      if let after = after, let afterId = UInt64(after) {
        if let foundIndex = items.firstIndex(where: { $0.persistentID == afterId }) {
          startIndex = foundIndex + 1
        }
      }
      
      let endIndex = min(startIndex + first, items.count)
      let paginatedItems = startIndex < items.count ? Array(items[startIndex..<endIndex]) : []
      
      let assets = paginatedItems.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }
      
      let response: [String: Any] = [
        "assets": assets,
        "endCursor": paginatedItems.last.map { "\($0.persistentID)" } ?? after ?? "",
        "hasNextPage": endIndex < items.count,
        "totalCount": items.count
      ]

      promise.resolve(response)
    }

    OnStartObserving {
      let delegate = MusicLibraryObserver(handler: self)
      self.changeDelegate = delegate
    }

    OnStopObserving {
      self.changeDelegate = nil
    }
  }

  // FIXED: Simplified permission check
  private func checkPermissions(promise: Promise) -> Bool {
    if MPMediaLibrary.authorizationStatus() != .authorized {
      promise.reject(MusicLibraryPermissionsException())
      return false
    }
    return true
  }

  // Keep for backwards compatibility but not used in new code
  private func runIfAllPermissionsWereGranted(reject: @escaping EXPromiseRejectBlock, block: @escaping () -> Void) {
    if MPMediaLibrary.authorizationStatus() == .authorized {
      block()
    } else {
      reject("E_NO_PERMISSIONS", "MUSIC_LIBRARY permission is required to do this operation.", nil)
    }
  }
  
  @objc
  private func handleMusicLibraryChange() {
    sendEvent("musicLibraryDidChange", [
      "hasIncrementalChanges": true
    ])
  }
}
