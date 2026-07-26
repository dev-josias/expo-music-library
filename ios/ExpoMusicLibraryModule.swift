import ExpoModulesCore
import MediaPlayer

public class MusicLibraryModule: Module, MusicLibraryObserverHandler {
  private struct ParsedQueryOptions {
    let first: Int
    let after: String?
    let sortBy: [String]
    let availability: MusicAssetAvailabilityFilter
    let artwork: MusicArtworkMode
  }

  private var changeDelegate: MusicLibraryObserver?

  func didChange() {
    // MPMediaLibraryDidChange is an invalidation notification. It doesn't
    // include an incremental diff, so consumers must refresh cached queries.
    sendEvent("onChange", [
      "hasIncrementalChanges": false,
      "requiresReload": true,
      "requiresFullReload": true
    ])
  }

  public func definition() -> ModuleDefinition {
    Name("ExpoMusicLibrary")

    Events("onChange")

    Constants {
      [
        "MediaType": [
          "audio": "audio"
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

    AsyncFunction("getPermissionsAsync") { (writeOnly: Bool, promise: Promise) in
      // Keep the parameter for source compatibility. MediaPlayer doesn't offer
      // a separate write-only authorization mode.
      _ = writeOnly
      promise.resolve(self.permissionResponse(for: MPMediaLibrary.authorizationStatus()))
    }

    AsyncFunction("requestPermissionsAsync") { (writeOnly: Bool, promise: Promise) in
      _ = writeOnly
      MPMediaLibrary.requestAuthorization { status in
        DispatchQueue.main.async {
          promise.resolve(self.permissionResponse(for: status))
        }
      }
    }

    AsyncFunction("getCapabilitiesAsync") { () -> [String: Any] in
      [
        "playlists": true,
        "directories": false,
        "cloudItems": true,
        "protectedAssets": true,
        "uriSchemes": ["ipod-library"]
      ]
    }

    AsyncFunction("getFoldersAsync") { (promise: Promise) in
      guard self.checkPermissions(promise: promise) else {
        return
      }

      let collections = MPMediaQuery.playlists().collections ?? []
      promise.resolve(collections.compactMap { $0.formatAsPlaylist() })
    }

    AsyncFunction("getFolderAssetsAsync") {
      (folderId: String, options: [String: Any]?, promise: Promise) in
      guard self.checkPermissions(promise: promise),
            let playlistId = self.requiredPersistentID(
              folderId,
              field: "folderId",
              promise: promise
            ),
            let parsedOptions = self.parseQueryOptions(options, promise: promise) else {
        return
      }

      guard let playlist = getMPMediaPlaylistBy(persistentID: playlistId) else {
        promise.reject(
          "E_FOLDER_NOT_FOUND",
          "Playlist with id \(folderId) was not found."
        )
        return
      }

      guard let result = self.pagedResult(
        items: playlist.items,
        options: parsedOptions,
        promise: promise
      ) else {
        return
      }
      promise.resolve(result)
    }

    AsyncFunction("getAlbumsAsync") { (promise: Promise) in
      guard self.checkPermissions(promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      query.groupingType = .album
      let collections = query.collections ?? []
      promise.resolve(collections.map { $0.formatAsAlbum() })
    }

    AsyncFunction("getAlbumAssetsAsync") {
      (albumId: String, options: [String: Any]?, promise: Promise) in
      guard self.checkPermissions(promise: promise),
            let persistentID = self.requiredPersistentID(
              albumId,
              field: "albumId",
              promise: promise
            ),
            let parsedOptions = self.parseQueryOptions(options, promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      query.addFilterPredicate(
        MPMediaPropertyPredicate(
          value: NSNumber(value: persistentID),
          forProperty: MPMediaItemPropertyAlbumPersistentID
        )
      )

      guard let result = self.pagedResult(
        items: query.items ?? [],
        options: parsedOptions,
        promise: promise
      ) else {
        return
      }
      promise.resolve(result)
    }

    AsyncFunction("getArtistsAsync") { (promise: Promise) in
      guard self.checkPermissions(promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      query.groupingType = .artist
      let collections = query.collections ?? []
      promise.resolve(collections.map { $0.formatAsArtist() })
    }

    AsyncFunction("getArtistAssetsAsync") {
      (artistId: String, options: [String: Any]?, promise: Promise) in
      guard self.checkPermissions(promise: promise),
            let persistentID = self.requiredPersistentID(
              artistId,
              field: "artistId",
              promise: promise
            ),
            let parsedOptions = self.parseQueryOptions(options, promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      query.addFilterPredicate(
        MPMediaPropertyPredicate(
          value: NSNumber(value: persistentID),
          forProperty: MPMediaItemPropertyArtistPersistentID
        )
      )

      guard let result = self.pagedResult(
        items: query.items ?? [],
        options: parsedOptions,
        promise: promise
      ) else {
        return
      }
      promise.resolve(result)
    }

    AsyncFunction("getGenresAsync") { (promise: Promise) in
      guard self.checkPermissions(promise: promise) else {
        return
      }

      // genres() matches the entire media library, while every asset endpoint
      // in this module returns songs. Group a songs query instead so counts and
      // IDs describe the same result set as getGenreAssetsAsync.
      let query = MPMediaQuery.songs()
      query.groupingType = .genre
      let collections = query.collections ?? []
      promise.resolve(collections.map { $0.formatAsGenre() })
    }

    AsyncFunction("getGenreAssetsAsync") {
      (genreId: String, options: [String: Any]?, promise: Promise) in
      guard self.checkPermissions(promise: promise),
            let persistentID = self.requiredPersistentID(
              genreId,
              field: "genreId",
              promise: promise
            ),
            let parsedOptions = self.parseQueryOptions(options, promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      query.addFilterPredicate(
        MPMediaPropertyPredicate(
          value: NSNumber(value: persistentID),
          forProperty: MPMediaItemPropertyGenrePersistentID
        )
      )

      guard let result = self.pagedResult(
        items: query.items ?? [],
        options: parsedOptions,
        promise: promise
      ) else {
        return
      }
      promise.resolve(result)
    }

    AsyncFunction("getAssetsAsync") {
      (options: [String: Any]?, promise: Promise) in
      guard self.checkPermissions(promise: promise),
            let parsedOptions = self.parseQueryOptions(options, promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      guard self.applyCollectionFilters(
        to: query,
        options: options,
        promise: promise
      ) else {
        return
      }

      guard let dateFilteredItems = self.applyDateFilters(
        to: query.items ?? [],
        options: options,
        promise: promise
      ),
      let result = self.pagedResult(
        items: dateFilteredItems,
        options: parsedOptions,
        promise: promise
      ) else {
        return
      }
      promise.resolve(result)
    }

    AsyncFunction("getAssetByIdAsync") { (assetId: String, promise: Promise) in
      guard self.checkPermissions(promise: promise),
            let persistentID = self.requiredPersistentID(
              assetId,
              field: "assetId",
              promise: promise
            ) else {
        return
      }

      guard let item = getMPMediaItemBy(persistentID: persistentID) else {
        promise.reject(
          "E_ASSET_NOT_FOUND",
          "Asset with id \(assetId) was not found."
        )
        return
      }

      promise.resolve(formatSongFromMediaItem(item))
    }

    AsyncFunction("searchAssetsAsync") {
      (searchQuery: String, options: [String: Any]?, promise: Promise) in
      guard self.checkPermissions(promise: promise) else {
        return
      }

      let trimmedQuery = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
      guard !trimmedQuery.isEmpty else {
        promise.reject("E_INVALID_SEARCH_QUERY", "Search query cannot be empty.")
        return
      }

      guard let parsedOptions = self.parseQueryOptions(options, promise: promise) else {
        return
      }

      let query = MPMediaQuery.songs()
      guard self.applyCollectionFilters(
        to: query,
        options: options,
        promise: promise
      ) else {
        return
      }

      let matchingItems = (query.items ?? []).filter { item in
        item.title?.localizedCaseInsensitiveContains(trimmedQuery) == true ||
          item.artist?.localizedCaseInsensitiveContains(trimmedQuery) == true ||
          item.albumTitle?.localizedCaseInsensitiveContains(trimmedQuery) == true
      }

      guard let dateFilteredItems = self.applyDateFilters(
        to: matchingItems,
        options: options,
        promise: promise
      ),
      let result = self.pagedResult(
        items: dateFilteredItems,
        options: parsedOptions,
        promise: promise
      ) else {
        return
      }
      promise.resolve(result)
    }

    OnStartObserving {
      self.changeDelegate = MusicLibraryObserver(handler: self)
    }

    OnStopObserving {
      self.changeDelegate = nil
    }
  }

  // MARK: - Permission helpers

  private func permissionResponse(
    for status: MPMediaLibraryAuthorizationStatus
  ) -> [String: Any] {
    let statusValue: String
    let granted: Bool
    let canAskAgain: Bool

    switch status {
    case .authorized:
      statusValue = "granted"
      granted = true
      canAskAgain = true
    case .denied, .restricted:
      statusValue = "denied"
      granted = false
      canAskAgain = false
    case .notDetermined:
      statusValue = "undetermined"
      granted = false
      canAskAgain = true
    @unknown default:
      statusValue = "undetermined"
      granted = false
      canAskAgain = true
    }

    return [
      "status": statusValue,
      "expires": "never",
      "granted": granted,
      "canAskAgain": canAskAgain,
      "canAccessAllFiles": granted,
      "accessPrivileges": granted ? "all" : "none",
      // MPMediaItemArtwork is covered by Music Library authorization and
      // doesn't require Photo Library access.
      "artworkAccess": granted
    ]
  }

  private func checkPermissions(promise: Promise) -> Bool {
    guard MPMediaLibrary.authorizationStatus() == .authorized else {
      promise.reject(
        "E_NO_MUSIC_LIBRARY_PERMISSION",
        "Music Library permission is required."
      )
      return false
    }
    return true
  }

  // MARK: - Input validation

  private func requiredPersistentID(
    _ value: String,
    field: String,
    promise: Promise
  ) -> UInt64? {
    guard let id = UInt64(value), id > 0 else {
      promise.reject(
        "E_INVALID_IDENTIFIER",
        "\(field) must be a positive numeric persistent ID."
      )
      return nil
    }
    return id
  }

  private func parseQueryOptions(
    _ options: [String: Any]?,
    promise: Promise
  ) -> ParsedQueryOptions? {
    let first: Int
    if let rawFirst = options?["first"], !(rawFirst is NSNull) {
      guard !(rawFirst is Bool),
            let number = rawFirst as? NSNumber else {
        promise.reject("E_INVALID_PAGINATION", "first must be an integer.")
        return nil
      }

      let value = number.doubleValue
      guard value.isFinite,
            value.rounded() == value,
            value >= 1,
            value <= 1000 else {
        promise.reject(
          "E_INVALID_PAGINATION",
          "first must be an integer between 1 and 1000."
        )
        return nil
      }
      first = Int(value)
    } else {
      first = 20
    }

    let after: String?
    if let rawAfter = options?["after"], !(rawAfter is NSNull) {
      guard let cursor = rawAfter as? String,
            let cursorID = UInt64(cursor),
            cursorID > 0 else {
        promise.reject(
          "E_INVALID_CURSOR",
          "after must be a valid persistent-ID cursor."
        )
        return nil
      }
      after = cursor
    } else {
      after = nil
    }

    let sortBy: [String]
    if let rawSortBy = options?["sortBy"], !(rawSortBy is NSNull) {
      guard let values = rawSortBy as? [String],
            validateSortOptions(values) else {
        promise.reject("E_INVALID_SORT", "sortBy contains an invalid descriptor.")
        return nil
      }
      sortBy = values
    } else {
      sortBy = []
    }

    let availability: MusicAssetAvailabilityFilter
    if let rawAvailability = options?["availability"], !(rawAvailability is NSNull) {
      guard let value = rawAvailability as? String,
            let parsed = MusicAssetAvailabilityFilter(rawValue: value) else {
        promise.reject(
          "E_INVALID_AVAILABILITY_FILTER",
          "availability must be all, hasAssetUrl, or avFoundationAccessible."
        )
        return nil
      }
      availability = parsed
    } else {
      availability = .all
    }

    let artwork: MusicArtworkMode
    if let rawArtwork = options?["artwork"], !(rawArtwork is NSNull) {
      guard let value = rawArtwork as? String,
            let parsed = MusicArtworkMode(rawValue: value) else {
        promise.reject(
          "E_INVALID_ARTWORK_MODE",
          "artwork must be legacy, uri, or none."
        )
        return nil
      }
      artwork = parsed
    } else {
      artwork = .legacy
    }

    return ParsedQueryOptions(
      first: first,
      after: after,
      sortBy: sortBy,
      availability: availability,
      artwork: artwork
    )
  }

  private func applyCollectionFilters(
    to query: MPMediaQuery,
    options: [String: Any]?,
    promise: Promise
  ) -> Bool {
    let filters: [(key: String, property: String)] = [
      ("album", MPMediaItemPropertyAlbumPersistentID),
      ("artist", MPMediaItemPropertyArtistPersistentID),
      ("genre", MPMediaItemPropertyGenrePersistentID)
    ]

    for filter in filters {
      guard let rawValue = options?[filter.key], !(rawValue is NSNull) else {
        continue
      }

      guard let value = rawValue as? String,
            let persistentID = UInt64(value),
            persistentID > 0 else {
        promise.reject(
          "E_INVALID_IDENTIFIER",
          "\(filter.key) must be a positive numeric persistent ID."
        )
        return false
      }

      query.addFilterPredicate(
        MPMediaPropertyPredicate(
          value: NSNumber(value: persistentID),
          forProperty: filter.property
        )
      )
    }

    return true
  }

  private func optionalTimestamp(
    in options: [String: Any]?,
    key: String,
    promise: Promise
  ) -> Double?? {
    guard let rawValue = options?[key], !(rawValue is NSNull) else {
      return .some(nil)
    }

    guard !(rawValue is Bool),
          let number = rawValue as? NSNumber,
          number.doubleValue.isFinite else {
      promise.reject("E_INVALID_DATE_FILTER", "\(key) must be a finite timestamp.")
      return nil
    }
    return .some(number.doubleValue)
  }

  private func applyDateFilters(
    to items: [MPMediaItem],
    options: [String: Any]?,
    promise: Promise
  ) -> [MPMediaItem]? {
    guard let createdAfter = optionalTimestamp(
      in: options,
      key: "createdAfter",
      promise: promise
    ),
    let createdBefore = optionalTimestamp(
      in: options,
      key: "createdBefore",
      promise: promise
    ) else {
      return nil
    }

    if let createdAfter,
       let createdBefore,
       createdAfter > createdBefore {
      promise.reject(
        "E_INVALID_DATE_FILTER",
        "createdAfter must not be later than createdBefore."
      )
      return nil
    }

    var result = items
    if let createdAfter {
      let date = Date(timeIntervalSince1970: createdAfter / 1000)
      result = result.filter { $0.dateAdded >= date }
    }
    if let createdBefore {
      let date = Date(timeIntervalSince1970: createdBefore / 1000)
      result = result.filter { $0.dateAdded <= date }
    }
    return result
  }

  // MARK: - Paging

  private func pagedResult(
    items: [MPMediaItem],
    options: ParsedQueryOptions,
    promise: Promise
  ) -> [String: Any]? {
    var filteredItems = uniqueSupportedMusicItems(items).filter {
      itemMatchesAvailability($0, filter: options.availability)
    }
    filteredItems = sortMPMediaItems(filteredItems, by: options.sortBy)

    let startIndex: Int
    if let after = options.after,
       let afterID = UInt64(after) {
      guard let foundIndex = filteredItems.firstIndex(
        where: { $0.persistentID == afterID }
      ) else {
        promise.reject(
          "E_CURSOR_NOT_FOUND",
          "The pagination cursor is stale or does not belong to this query."
        )
        return nil
      }
      startIndex = foundIndex + 1
    } else {
      startIndex = 0
    }

    let endIndex = min(startIndex + options.first, filteredItems.count)
    let pageItems = startIndex < filteredItems.count
      ? Array(filteredItems[startIndex..<endIndex])
      : []

    return [
      "assets": pageItems.map {
        formatSongFromMediaItem($0, artworkMode: options.artwork)
      },
      "endCursor": pageItems.last.map { "\($0.persistentID)" } ?? options.after ?? "",
      "hasNextPage": endIndex < filteredItems.count,
      "totalCount": filteredItems.count
    ]
  }
}
