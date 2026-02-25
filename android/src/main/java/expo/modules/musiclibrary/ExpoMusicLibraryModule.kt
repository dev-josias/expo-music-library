package expo.modules.musiclibrary

import android.Manifest.permission.ACCESS_MEDIA_LOCATION
import android.Manifest.permission.READ_EXTERNAL_STORAGE
import android.Manifest.permission.READ_MEDIA_AUDIO
import android.Manifest.permission.READ_MEDIA_IMAGES
import android.Manifest.permission.READ_MEDIA_VIDEO
import android.Manifest.permission.WRITE_EXTERNAL_STORAGE
import android.annotation.SuppressLint
import android.content.Context
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
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
import expo.modules.musiclibrary.assets.GetAssetById
import expo.modules.musiclibrary.assets.GetAssets
import expo.modules.musiclibrary.assets.GetSearchAssets
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
  private var mediaObserver: ContentObserver? = null

  override fun definition() = ModuleDefinition {
    Name("ExpoMusicLibrary")

    Constants {
      return@Constants mapOf(
        "SortBy" to SortBy.getConstants(),
      )
    }

    Events("onChange")

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
          GetAlbums(context, promise).execute()
        }
      }
    }

    AsyncFunction("getAlbumAssetsAsync") { albumName: String, options: SubQueryOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetAlbumAssets(context, albumName, options, promise).execute()
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

    AsyncFunction("getArtistAssetsAsync") { artistId: String, options: SubQueryOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetArtistAssets(context, artistId, options, promise).execute()
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

    AsyncFunction("getGenreAssetsAsync") { genreId: String, options: SubQueryOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetGenreAssets(context, genreId, options, promise).execute()
        }
      }
    }

    AsyncFunction("getFolderAssetsAsync") { folderId: String, options: SubQueryOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetFolderAssets(context, folderId, options, promise).execute()
        }
      }
    }

    AsyncFunction("getAssetByIdAsync") { assetId: String, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetAssetById(context, assetId, promise).execute()
        }
      }
    }

    AsyncFunction("searchAssetsAsync") { query: String, assetsOptions: AssetsOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetSearchAssets(context, query, assetsOptions, promise).execute()
        }
      }
    }

    OnStartObserving {
      val handler = Handler(Looper.getMainLooper())
      mediaObserver = object : ContentObserver(handler) {
        override fun onChange(selfChange: Boolean) {
          sendEvent("onChange", mapOf("hasIncrementalChanges" to true))
        }
      }
      context.contentResolver.registerContentObserver(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        true,
        mediaObserver!!
      )
    }

    OnStopObserving {
      mediaObserver?.let { context.contentResolver.unregisterContentObserver(it) }
      mediaObserver = null
    }
  }

  @SuppressLint("InlinedApi")
  private fun getManifestPermissions(writeOnly: Boolean): Array<String> {
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
