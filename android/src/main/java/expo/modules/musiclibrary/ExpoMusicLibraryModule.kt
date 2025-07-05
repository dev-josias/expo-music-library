package expo.modules.musiclibrary

import android.Manifest.permission.ACCESS_MEDIA_LOCATION
import android.Manifest.permission.READ_EXTERNAL_STORAGE
import android.Manifest.permission.READ_MEDIA_AUDIO
import android.Manifest.permission.READ_MEDIA_IMAGES
import android.Manifest.permission.READ_MEDIA_VIDEO
import android.Manifest.permission.WRITE_EXTERNAL_STORAGE
import android.annotation.SuppressLint
import android.content.Context
import android.os.Build
import expo.modules.core.errors.ModuleDestroyedException
import expo.modules.interfaces.permissions.Permissions.askForPermissionsWithPermissionsManager
import expo.modules.interfaces.permissions.Permissions.getPermissionsWithPermissionsManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import expo.modules.musiclibrary.albums.GetAlbumAssets
import expo.modules.musiclibrary.albums.GetAlbums
import expo.modules.musiclibrary.artists.GetArtistAssets
import expo.modules.musiclibrary.artists.GetArtists
import expo.modules.musiclibrary.assets.GetAssets
import expo.modules.musiclibrary.folders.GetFolderAssets
import expo.modules.musiclibrary.folders.GetFolders
import expo.modules.musiclibrary.genres.GetGenreAssets
import expo.modules.musiclibrary.genres.GetGenres
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch

class ExpoMusicLibraryModule : Module() {
  private val context: Context
  get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val moduleCoroutineScope = CoroutineScope(Dispatchers.IO)

  // Each module class must implement the definition function. The definition consists of components
  // that describes the module's functionality and behavior.
  // See https://docs.expo.dev/modules/module-api for more details about available components.
  override fun definition() = ModuleDefinition {
    // Sets the name of the module that JavaScript code will use to refer to the module. Takes a string as an argument.
    // Can be inferred from module's class name, but it's recommended to set it explicitly for clarity.
    // The module will be accessible from `requireNativeModule('ExpoMusicLibrary')` in JavaScript.
    Name("ExpoMusicLibrary")

    // Sets constant properties on the module. Can take a dictionary or a closure that returns a dictionary.

    Constants {
      return@Constants mapOf(
        "SortBy" to SortBy.getConstants(),
      )
    }


    // Defines event names that the module can send to JavaScript.
    Events("onChange")

    // Defines a JavaScript synchronous function that runs the native code on the JavaScript thread.
    Function("hello") {
      "Hello world! 👋"
    }

    // Defines a JavaScript function that always returns a Promise and whose native code
    // is by default dispatched on the different thread than the JavaScript runtime runs on.
    AsyncFunction("setValueAsync") { value: String ->
      // Send an event to JavaScript.
      sendEvent("onChange", mapOf(
        "value" to value
      ))
    }

    AsyncFunction("requestPermissionsAsync") { writeOnly: Boolean, promise: Promise ->
      askForPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        *getManifestPermissions(writeOnly)
      )
    }


    AsyncFunction("getPermissionsAsync") { writeOnly: Boolean, promise: Promise ->
      getPermissionsWithPermissionsManager(
        appContext.permissions,
        promise,
        *getManifestPermissions(writeOnly)
      )
    }

    AsyncFunction("getFoldersAsync") { promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetFolders(context, promise).execute()
        }
      }
    }

    AsyncFunction("getAlbumsAsync") { promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetAlbums(
            context, promise
          ).execute()
        }
      }
    }
    AsyncFunction("getAlbumAssetsAsync") { albumName: String, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetAlbumAssets(context, albumName, promise).execute()
        }
      }
    }

    AsyncFunction("getAssetsAsync") { assetsOptions: AssetsOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetAssets(context, assetsOptions, promise).execute()
        }
      }
    }

    AsyncFunction("getArtistsAsync") { promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetArtists(context, promise).execute()
        }
      }
    }

    AsyncFunction("getArtistAssetsAsync") { artistId: String, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetArtistAssets(context, artistId, promise).execute()
        }
      }
    }

    AsyncFunction("getGenresAsync") { promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetGenres(context, promise).execute()
        }
      }
    }

    AsyncFunction("getGenreAssetsAsync") { genreId: String, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetGenreAssets(context, genreId, promise).execute()
        }
      }
    }

    AsyncFunction("getFolderAssetsAsync") { folderId: String, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetFolderAssets(context, folderId, promise).execute()
        }
      }
    }
  }
  @SuppressLint("InlinedApi")
  private fun getManifestPermissions(writeOnly: Boolean): Array<String> {
    // ACCESS_MEDIA_LOCATION should not be requested if it's absent in android-manifest
    val shouldAddMediaLocationAccess = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q &&
        MediaLibraryUtils.hasManifestPermission(context, ACCESS_MEDIA_LOCATION)

    val shouldAddWriteExternalStorage = Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU &&
        MediaLibraryUtils.hasManifestPermission(context, WRITE_EXTERNAL_STORAGE)

    val shouldAddGranularPermissions = Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        listOf(READ_MEDIA_AUDIO, READ_MEDIA_VIDEO, READ_MEDIA_IMAGES)
          .all { MediaLibraryUtils.hasManifestPermission(context, it) }

    return listOfNotNull(
      WRITE_EXTERNAL_STORAGE.takeIf { shouldAddWriteExternalStorage },
      READ_EXTERNAL_STORAGE.takeIf { !writeOnly && !shouldAddGranularPermissions },
      ACCESS_MEDIA_LOCATION.takeIf { shouldAddMediaLocationAccess },
      *getGranularPermissions(writeOnly, shouldAddGranularPermissions)
    ).toTypedArray()
  }

  private inline fun withModuleScope(promise: Promise, crossinline block: () -> Unit) = moduleCoroutineScope.launch {
    try {
      block()
    } catch (e: CodedException) {
      promise.reject(e)
    } catch (e: ModuleDestroyedException) {
      promise.reject(TAG, "MediaLibrary module destroyed", e)
    }
  }

  @SuppressLint("InlinedApi")
  private fun getGranularPermissions(writeOnly: Boolean, shouldAdd: Boolean): Array<String> {
    val addPermission = !writeOnly && shouldAdd
    return listOfNotNull(
      READ_MEDIA_IMAGES.takeIf { addPermission },
      READ_MEDIA_VIDEO.takeIf { addPermission },
      READ_MEDIA_AUDIO.takeIf { addPermission }
    ).toTypedArray()
  }

  private val isMissingPermissions: Boolean
    get() = hasReadPermissions()

  private val isMissingWritePermission: Boolean
    get() = hasWritePermissions()

  private inline fun throwUnlessPermissionsGranted(isWrite: Boolean = true, block: () -> Unit) {
    val missingPermissionsCondition = if (isWrite) isMissingWritePermission else isMissingPermissions
    val missingPermissionsMessage = if (isWrite) ERROR_NO_WRITE_PERMISSION_MESSAGE else ERROR_NO_PERMISSIONS_MESSAGE
    if (missingPermissionsCondition) {
      throw PermissionsException(missingPermissionsMessage)
    }
    block()
  }

  private fun hasReadPermissions(): Boolean {
    val permissions = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      arrayOf(READ_MEDIA_IMAGES, READ_MEDIA_AUDIO, READ_MEDIA_VIDEO)
    } else {
      arrayOf(READ_EXTERNAL_STORAGE, WRITE_EXTERNAL_STORAGE)
    }

    return appContext.permissions
      ?.hasGrantedPermissions(*permissions)
      ?.not() ?: false
  }

  private fun hasWritePermissions() = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
    false
  } else {
    appContext.permissions
      ?.hasGrantedPermissions(WRITE_EXTERNAL_STORAGE)
      ?.not() ?: false
  }

  companion object {
    private const val WRITE_REQUEST_CODE = 7463
    internal val TAG = ExpoMusicLibraryModule::class.java.simpleName
  }
}
