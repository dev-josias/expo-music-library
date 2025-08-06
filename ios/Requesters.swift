import ExpoModulesCore
import MediaPlayer
import Photos

public class MusicLibraryPermissionRequester: NSObject, EXPermissionsRequester {
  public static func permissionType() -> String {
    return "musicLibrary"
  }
  
  @objc
  public func requestPermissions(resolver resolve: @escaping EXPromiseResolveBlock, rejecter reject: EXPromiseRejectBlock) {
    // Request Music Library permission first
    MPMediaLibrary.requestAuthorization { musicStatus in
      DispatchQueue.main.async {
        // Also request Photo Library permission for artwork access
        PHPhotoLibrary.requestAuthorization { photoStatus in
          DispatchQueue.main.async {
            resolve(self.getPermissions())
          }
        }
      }
    }
  }

  @objc
  public func getPermissions() -> [AnyHashable: Any] {
    let musicAuthStatus = MPMediaLibrary.authorizationStatus()
    let photoAuthStatus = PHPhotoLibrary.authorizationStatus()
    
    var status: EXPermissionStatus
    var scope: String
    
    // Primary permission is based on Music Library access
    switch musicAuthStatus {
    case .authorized:
      status = EXPermissionStatusGranted
      scope = "all"
    case .denied, .restricted:
      status = EXPermissionStatusDenied
      scope = "none"
    case .notDetermined:
      fallthrough
    @unknown default:
      status = EXPermissionStatusUndetermined
      scope = "none"
    }

    return [
      "status": status.rawValue,
      "accessPrivileges": scope,
      "granted": status == EXPermissionStatusGranted,
      "canAccessAllFiles": status == EXPermissionStatusGranted,
      "artworkAccess": photoAuthStatus == .authorized
    ]
  }
}

public class MusicLibraryWriteOnlyPermissionRequester: NSObject, EXPermissionsRequester {
  public static func permissionType() -> String {
    return "musicLibraryWriteOnly"
  }
  
  @objc
  public func requestPermissions(resolver resolve: @escaping EXPromiseResolveBlock, rejecter reject: EXPromiseRejectBlock) {
    // For music library, "write only" doesn't really apply since iOS doesn't allow
    // programmatic addition of music files. This is the same as regular permission.
    MPMediaLibrary.requestAuthorization { musicStatus in
      DispatchQueue.main.async {
        resolve(self.getPermissions())
      }
    }
  }

  @objc
  public func getPermissions() -> [AnyHashable: Any] {
    let musicAuthStatus = MPMediaLibrary.authorizationStatus()
    
    var status: EXPermissionStatus
    var scope: String
    
    switch musicAuthStatus {
    case .authorized:
      status = EXPermissionStatusGranted
      scope = "all"
    case .denied, .restricted:
      status = EXPermissionStatusDenied
      scope = "none"
    case .notDetermined:
      fallthrough
    @unknown default:
      status = EXPermissionStatusUndetermined
      scope = "none"
    }

    return [
      "status": status.rawValue,
      "accessPrivileges": scope,
      "granted": status == EXPermissionStatusGranted,
      "canAccessAllFiles": status == EXPermissionStatusGranted
    ]
  }
}

// MARK: - Alternative Simplified Approach (Recommended)

/// Simplified permission requester that only handles Music Library permissions
/// Use this if you don't need the Expo permissions module integration
public class SimpleMusicLibraryPermissionRequester {
  
  public static func requestMusicLibraryPermission() async -> Bool {
    return await withCheckedContinuation { continuation in
      MPMediaLibrary.requestAuthorization { status in
        continuation.resume(returning: status == .authorized)
      }
    }
  }
  
  public static func requestBothPermissions() async -> (musicGranted: Bool, artworkGranted: Bool) {
    let musicGranted = await requestMusicLibraryPermission()
    let artworkGranted = await requestPhotoLibraryPermission()
    return (musicGranted, artworkGranted)
  }
  
  public static func requestPhotoLibraryPermission() async -> Bool {
    return await withCheckedContinuation { continuation in
      PHPhotoLibrary.requestAuthorization { status in
        continuation.resume(returning: status == .authorized)
      }
    }
  }
  
  public static func getMusicLibraryPermissionStatus() -> (
    musicAuthorized: Bool,
    artworkAuthorized: Bool,
    status: String
  ) {
    let musicStatus = MPMediaLibrary.authorizationStatus()
    let photoStatus = PHPhotoLibrary.authorizationStatus()
    
    let musicAuthorized = musicStatus == .authorized
    let artworkAuthorized = photoStatus == .authorized
    
    let statusString: String
    switch musicStatus {
    case .authorized:
      statusString = "granted"
    case .denied, .restricted:
      statusString = "denied"
    case .notDetermined:
      statusString = "undetermined"
    @unknown default:
      statusString = "undetermined"
    }
    
    return (
      musicAuthorized: musicAuthorized,
      artworkAuthorized: artworkAuthorized,
      status: statusString
    )
  }
}
