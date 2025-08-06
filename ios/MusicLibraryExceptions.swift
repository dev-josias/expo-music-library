import ExpoModulesCore
import MediaPlayer

let defaultErrorMessage = "unspecified error"

internal final class MusicLibraryPermissionsException: Exception, @unchecked Sendable {
  override var reason: String {
    "Music Library permission is required to do this operation"
  }
}

internal final class EmptyFileExtensionException: Exception, @unchecked Sendable {
  override var reason: String {
    "Could not get the file's extension - it was empty."
  }
}

internal final class UnsupportedAssetTypeException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "This URL does not contain a valid audio asset type: \(param)"
  }
}

internal final class UnreadableAssetException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "File \(param) isn't readable"
  }
}

// UPDATED: Changed from "photo library" to "music library"
internal final class SaveAssetException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Asset couldn't be saved to music library: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

internal final class MissingPListKeyException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "This app is missing \(param). Add this entry to your bundle's Info.plist"
  }
}

internal final class MissingFileException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Couldn't open file: \(param). Make sure if this file exists"
  }
}

// UPDATED: Changed to audio-specific
internal final class SaveAudioException: Exception, @unchecked Sendable {
  override var reason: String {
    "This audio file couldn't be saved to the Music Library"
  }
}

// UPDATED: Changed to music-specific terminology
internal final class SavePlaylistException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Couldn't add assets to playlist: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

internal final class RemoveFromPlaylistException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Couldn't remove assets from playlist: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

internal final class RemoveAssetsException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Couldn't remove assets: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

// UPDATED: More specific about audio file types
internal final class UnsupportedAudioFormatException: Exception, @unchecked Sendable {
  override var reason: String {
    "This audio file format is not supported yet"
  }
}

// UPDATED: Changed from photos to music library
internal final class NotEnoughPermissionsException: Exception, @unchecked Sendable {
  override var reason: String {
    "Full access to music library is required to do this operation"
  }
}

internal final class FailedToAddAssetException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Unable to add asset to the playlist: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

// UPDATED: Changed from album to playlist (more appropriate for music)
internal final class CreatePlaylistFailedException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Could not create playlist: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

internal final class DeletePlaylistFailedException: GenericException<(any Error)?>, @unchecked Sendable {
  override var reason: String {
    "Could not delete playlist: \(param?.localizedDescription ?? defaultErrorMessage)"
  }
}

internal final class CursorException: Exception, @unchecked Sendable {
  override var reason: String {
    "Couldn't find cursor"
  }
}

internal final class SortByKeyException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "SortBy key \"\(param)\" is not supported"
  }
}

internal final class PermissionsModuleNotFoundException: Exception, @unchecked Sendable {
  override var reason: String {
    "Permissions module not found. Are you sure that Expo modules are properly linked?"
  }
}

// REMOVED: Video-specific exceptions since this is a music library

// ADDED: Music-specific exceptions
internal final class MusicLibraryUnavailableException: Exception, @unchecked Sendable {
  override var reason: String {
    "Music Library is not available on this device"
  }
}

internal final class InvalidAudioFileException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Invalid audio file: \(param)"
  }
}

internal final class ArtworkAccessException: Exception, @unchecked Sendable {
  override var reason: String {
    "Cannot access artwork - photo library permission may be required"
  }
}

internal final class PlaylistNotFoundException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Playlist with ID '\(param)' not found"
  }
}

internal final class ArtistNotFoundException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Artist with ID '\(param)' not found"
  }
}

internal final class AlbumNotFoundException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Album with ID '\(param)' not found"
  }
}

internal final class GenreNotFoundException: GenericException<String>, @unchecked Sendable {
  override var reason: String {
    "Genre with ID '\(param)' not found"
  }
}

internal final class InvalidPaginationException: Exception, @unchecked Sendable {
  override var reason: String {
    "Invalid pagination parameters"
  }
}

internal final class MusicLibraryEmptyException: Exception, @unchecked Sendable {
  override var reason: String {
    "Music library is empty or no songs match the criteria"
  }
}

// ADDED: Convenience method for common permission error
internal func requireMusicLibraryPermission() throws {
  if MPMediaLibrary.authorizationStatus() != .authorized {
    throw MusicLibraryPermissionsException()
  }
}
