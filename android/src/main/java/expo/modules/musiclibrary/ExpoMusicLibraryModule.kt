package expo.modules.musiclibrary

import android.Manifest.permission.READ_EXTERNAL_STORAGE
import android.Manifest.permission.READ_MEDIA_AUDIO
import android.annotation.SuppressLint
import android.content.ContentResolver
import android.content.Context
import android.database.ContentObserver
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.MediaStore
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
import kotlinx.coroutines.CancellationException
import kotlinx.coroutines.launch

class ExpoMusicLibraryModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  private val observationLock = Any()
  private var mediaObserver: ContentObserver? = null
  private var observedContentResolver: ContentResolver? = null
  private var isDestroyed = false

  override fun definition() = ModuleDefinition {
    Name("ExpoMusicLibrary")

    Constant("MediaType") {
      MediaType.getConstants()
    }

    Constant("SortBy") {
      SortBy.getConstants()
    }

    Events("onChange")

    AsyncFunction("requestPermissionsAsync") { writeOnly: Boolean, promise: Promise ->
      val permissions = getManifestPermissions(writeOnly)
      if (permissions.isEmpty()) {
        resolveGrantedPermission(promise)
      } else {
        askForPermissionsWithPermissionsManager(
          appContext.permissions,
          promise,
          *permissions
        )
      }
    }

    AsyncFunction("getPermissionsAsync") { writeOnly: Boolean, promise: Promise ->
      val permissions = getManifestPermissions(writeOnly)
      if (permissions.isEmpty()) {
        resolveGrantedPermission(promise)
      } else {
        getPermissionsWithPermissionsManager(
          appContext.permissions,
          promise,
          *permissions
        )
      }
    }

    AsyncFunction("getCapabilitiesAsync") { promise: Promise ->
      promise.resolve(
        mapOf(
          "playlists" to false,
          "directories" to true,
          "cloudItems" to false,
          "protectedAssets" to (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R),
          "uriSchemes" to if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            listOf("content", "file")
          } else {
            listOf("content")
          }
        )
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

    AsyncFunction("getAlbumAssetsAsync") { albumId: String, options: SubQueryOptions, promise: Promise ->
      throwUnlessPermissionsGranted(isWrite = false) {
        withModuleScope(promise) {
          GetAlbumAssets(context, albumId, options, promise).execute()
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

    OnStartObserving("onChange") {
      synchronized(observationLock) {
        if (isDestroyed || mediaObserver != null) {
          return@OnStartObserving
        }

        val handler = Handler(Looper.getMainLooper())
        val observer = object : ContentObserver(handler) {
          override fun onChange(selfChange: Boolean) {
            synchronized(observationLock) {
              if (isDestroyed || mediaObserver !== this) {
                return
              }
              sendEvent(
                "onChange",
                mapOf(
                  "hasIncrementalChanges" to false,
                  "requiresReload" to true,
                  "requiresFullReload" to true
                )
              )
            }
          }
        }
        val contentResolver = context.contentResolver
        contentResolver.registerContentObserver(
          MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
          true,
          observer
        )
        observedContentResolver = contentResolver
        mediaObserver = observer
      }
    }

    OnStopObserving("onChange") {
      stopObserving()
    }

    OnDestroy {
      stopObserving(destroy = true)
    }
  }

  @SuppressLint("InlinedApi")
  private fun getManifestPermissions(
    @Suppress("UNUSED_PARAMETER") writeOnly: Boolean
  ): Array<String> {
    return when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> arrayOf(READ_MEDIA_AUDIO)
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> arrayOf(READ_EXTERNAL_STORAGE)
      else -> emptyArray()
    }
  }

  private inline fun withModuleScope(promise: Promise, crossinline block: () -> Unit) =
    appContext.backgroundCoroutineScope.launch {
      try {
        block()
      } catch (e: CancellationException) {
        throw e
      } catch (e: CodedException) {
        promise.reject(e)
      } catch (e: Exception) {
        promise.reject(ERROR_UNABLE_TO_LOAD, e.message ?: "Unable to access the music library", e)
      }
    }

  private fun stopObserving(destroy: Boolean = false) {
    val observation = synchronized(observationLock) {
      if (destroy) {
        isDestroyed = true
      }

      val currentObservation = mediaObserver to observedContentResolver
      mediaObserver = null
      observedContentResolver = null
      currentObservation
    }

    val (observer, contentResolver) = observation
    if (observer != null && contentResolver != null) {
      contentResolver.unregisterContentObserver(observer)
    }
  }

  private fun resolveGrantedPermission(promise: Promise) {
    promise.resolve(
      mapOf(
        "status" to "granted",
        "granted" to true,
        "canAskAgain" to true,
        "expires" to "never"
      )
    )
  }

  private val isMissingPermissions: Boolean
    get() = hasReadPermissions()

  private inline fun throwUnlessPermissionsGranted(isWrite: Boolean = true, block: () -> Unit) {
    // The module exposes read-only MediaStore operations. `isWrite` remains in the
    // helper signature for source compatibility with the original implementation.
    val missingPermissionsCondition = if (isWrite) false else isMissingPermissions
    val missingPermissionsMessage = if (isWrite) ERROR_NO_WRITE_PERMISSION_MESSAGE else ERROR_NO_PERMISSIONS_MESSAGE
    if (missingPermissionsCondition) {
      throw PermissionsException(missingPermissionsMessage)
    }
    block()
  }

  private fun hasReadPermissions(): Boolean {
    val permissions = when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU -> arrayOf(READ_MEDIA_AUDIO)
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.M -> arrayOf(READ_EXTERNAL_STORAGE)
      else -> return false
    }

    return appContext.permissions
      ?.hasGrantedPermissions(*permissions)
      ?.not() ?: false
  }

  companion object {
    internal val TAG = ExpoMusicLibraryModule::class.java.simpleName
  }
}
