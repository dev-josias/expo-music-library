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

    AsyncFunction("getPermissionsAsync") { (writeOnly: Bool, promise: Promise) in
      self.writeOnly = writeOnly
      appContext?
        .permissions?
        .getPermissionUsingRequesterClass(
          requesterClass(writeOnly),
          resolve: promise.resolver,
          reject: promise.legacyRejecter
        )
    }

    AsyncFunction("requestPermissionsAsync") { [weak self] (writeOnly: Bool, promise: Promise) in
      guard let self = self else {
        promise.reject("E_SELF_DEALLOCATED", "Self was deallocated.")
        return
      }

      self.writeOnly = writeOnly
      let mediaLibraryStatus = MPMediaLibrary.authorizationStatus()

      switch mediaLibraryStatus {
      case .authorized:
        self.appContext?
          .permissions?
          .askForPermission(
            usingRequesterClass: requesterClass(writeOnly),
            resolve: promise.resolver,
            reject: promise.legacyRejecter
          )
        
      case .notDetermined:
        MPMediaLibrary.requestAuthorization { [weak self] newStatus in
          guard let self = self else {
            promise.reject("E_SELF_DEALLOCATED", "Self was deallocated.")
            return
          }
          DispatchQueue.main.async {
            if newStatus == .authorized {
              self.appContext?
                .permissions?
                .askForPermission(
                  usingRequesterClass: requesterClass(writeOnly),
                  resolve: promise.resolver,
                  reject: promise.legacyRejecter
                )
            } else {
              promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library access is required but was not granted.")
            }
          }
        }
        
      case .denied, .restricted:
        promise.reject("E_NO_MUSIC_LIBRARY_PERMISSION", "Music Library access is required but was not granted.")
        
      @unknown default:
        promise.reject("E_UNKNOWN", "An unknown error occurred while requesting media library permissions.")
      }
    }

    AsyncFunction("createAssetAsync") { (uri: URL, promise: Promise) in
      if !checkPermissions(promise: promise) {
        return
      }

      if uri.pathExtension.isEmpty || uri.pathExtension.lowercased() != "mp3" {
        promise.reject(UnsupportedAssetTypeException(uri.absoluteString))
        return
      }

      if !FileSystemUtilities.permissions(appContext, for: uri).contains(.read) {
        promise.reject(UnreadableAssetException(uri.absoluteString))
        return
      }

      var assetPlaceholder: PHObjectPlaceholder?
      PHPhotoLibrary.shared().performChanges {
        let changeRequest = PHAssetChangeRequest.creationRequestForAssetFromVideo(atFileURL: uri) // Modified for audio creation
        
        assetPlaceholder = changeRequest?.placeholderForCreatedAsset
      } completionHandler: { success, error in
        if success {
          let asset = getAssetBy(id: assetPlaceholder?.localIdentifier)
          promise.resolve(exportAsset(asset: asset))
        } else {
          promise.reject(SaveAssetException(error))
        }
      }
    }

    AsyncFunction("getFoldersAsync") { (promise: Promise) in
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
      let query = MPMediaQuery.songs()
      let predicate = MPMediaPropertyPredicate(value: UInt64(folderId), forProperty: MPMediaPlaylistPropertyPersistentID)
      query.addFilterPredicate(predicate)
      
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
      let query = MPMediaQuery.albums()
      guard let collections = query.collections else {
        promise.resolve([])
        return
      }

      let albums = collections.map { album -> [String: Any] in
        return [
          "id": "\(album.persistentID)",
          "title": album.representativeItem?.albumTitle ?? "Unknown Album",
          "artist": album.representativeItem?.artist ?? "Unknown Artist",
          "artwork": getArtwork(album.representativeItem) ?? ""
        ]
      }
      promise.resolve(albums)
    }

    AsyncFunction("getAlbumAssetsAsync") { (albumId: String, promise: Promise) in
      let query = MPMediaQuery.songs()
      let predicate = MPMediaPropertyPredicate(value: UInt64(albumId), forProperty: MPMediaItemPropertyAlbumPersistentID)
      query.addFilterPredicate(predicate)
      
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
      let query = MPMediaQuery.artists()
      guard let collections = query.collections else {
        promise.resolve([])
        return
      }

      let artists = collections.map { artist -> [String: Any] in
        return [
          "id": "\(artist.persistentID)",
          "title": artist.representativeItem?.artist ?? "Unknown Artist"
        ]
      }
      promise.resolve(artists)
    }

    AsyncFunction("getArtistAssetsAsync") { (artistId: String, promise: Promise) in
      let query = MPMediaQuery.songs()
      let predicate = MPMediaPropertyPredicate(value: UInt64(artistId), forProperty: MPMediaItemPropertyArtistPersistentID)
      query.addFilterPredicate(predicate)

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
      let query = MPMediaQuery.songs()
      let predicate = MPMediaPropertyPredicate(value: UInt64(genreId), forProperty: MPMediaItemPropertyGenrePersistentID)
      query.addFilterPredicate(predicate)

      guard let items = query.items else {
        promise.resolve([])
        return
      }

      let assets = items.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }
      promise.resolve(assets)
    }
    
    AsyncFunction("getAssetsAsync") { (options: [String: Any]?, promise: Promise) in
      let query = MPMediaQuery.songs() // Fetch all audio files by default

      // Handle album filter
      if let albumRef = options?["album"] as? String {
        let albumPredicate = MPMediaPropertyPredicate(value: UInt64(albumRef), forProperty: MPMediaItemPropertyAlbumPersistentID)
        query.addFilterPredicate(albumPredicate)
      }

      guard var items = query.items else {
        promise.resolve([])
        return
      }

      // Handle sorting - since iOS MPMediaQuery does not allow direct sorting, we do it post-fetch
      if let sortBy = options?["sortBy"] as? [[String: Any]] {
        for sortOption in sortBy {
          let sortKey = sortOption["key"] as? String
          let ascending = sortOption["ascending"] as? Bool ?? false

          switch sortKey {
          case "creationTime":
            items.sort { ascending ? $0.dateAdded < $1.dateAdded : $0.dateAdded > $1.dateAdded }
          case "modificationTime":
            items.sort { ascending ? $0.lastPlayedDate ?? Date() < $1.lastPlayedDate ?? Date() : $0.lastPlayedDate ?? Date() > $1.lastPlayedDate ?? Date() }
          case "duration":
            items.sort { ascending ? $0.playbackDuration < $1.playbackDuration : $0.playbackDuration > $1.playbackDuration }
          default:
            break
          }
        }
      }

      // Handle createdAfter and createdBefore filters manually after fetching the assets
      if let createdAfter = options?["createdAfter"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdAfter / 1000)
        items = items.filter { $0.dateAdded >= date }
      }

      if let createdBefore = options?["createdBefore"] as? TimeInterval {
        let date = Date(timeIntervalSince1970: createdBefore / 1000)
        items = items.filter { $0.dateAdded <= date }
      }

      // Handle pagination - limiting to "first" number of items
      if let first = options?["first"] as? Int {
        items = Array(items.prefix(first))
      }

      // Convert the MPMediaItems to the format expected by JavaScript
      let assets = items.map { item -> [String: Any] in
        return formatSongFromMediaItem(item)
      }

      promise.resolve(assets)
    }

    OnStartObserving {
      let delegate = MusicLibraryObserver(handler: self)
      self.changeDelegate = delegate
      NotificationCenter.default.addObserver(self, selector: #selector(handleMusicLibraryChange), name: .MPMediaLibraryDidChange, object: nil)
      MPMediaLibrary.default().beginGeneratingLibraryChangeNotifications()
    }

    OnStopObserving {
      self.changeDelegate = nil
      NotificationCenter.default.removeObserver(self, name: .MPMediaLibraryDidChange, object: nil)
      MPMediaLibrary.default().endGeneratingLibraryChangeNotifications()
    }
  }

  private func checkPermissions(promise: Promise) -> Bool {
    guard let permissions = appContext?.permissions else {
      promise.reject(MusicLibraryPermissionsException())
      return false
    }
    if !permissions.hasGrantedPermission(usingRequesterClass: requesterClass(self.writeOnly)) {
      promise.reject(MusicLibraryPermissionsException())
      return false
    }
    return true
  }

  private func runIfAllPermissionsWereGranted(reject: @escaping EXPromiseRejectBlock, block: @escaping () -> Void) {
    appContext?.permissions?.getPermissionUsingRequesterClass(
      MusicLibraryPermissionRequester.self,
      resolve: { result in
        if let permissions = result as? [String: Any], permissions["status"] as? String == "granted" {
          block()
        } else {
          reject("E_NO_PERMISSIONS", "MUSIC_LIBRARY permission is required to do this operation.", nil)
        }
      },
      reject: reject
    )
  }
  
  @objc
  private func handleMusicLibraryChange() {
    sendEvent("musicLibraryDidChange", [
      "hasIncrementalChanges": true
    ])
  }
}
