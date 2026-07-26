package expo.modules.musiclibrary.assets

import android.content.Context
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.AssetQueryException
import expo.modules.musiclibrary.AssetsOptions
import expo.modules.musiclibrary.ERROR_NO_PERMISSIONS
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import java.io.IOException

internal class GetAssets(
  private val context: Context,
  private val assetOptions: AssetsOptions,
  private val promise: Promise
) {
  fun execute() {
    val contentResolver = context.contentResolver
    try {
      val query = getQueryFromOptions(assetOptions)
      contentResolver.query(
        query.contentUri,
        query.projection,
        query.selection,
        query.selectionArgs.takeIf { it.isNotEmpty() },
        query.order
      ).use { assetsCursor ->
        if (assetsCursor == null) {
          throw AssetQueryException()
        }

        promise.resolve(
          createPagedResponse(
            contentResolver,
            assetsCursor,
            query.limit,
            query.offset,
            query.artworkMode,
            assetOptions.genre
          )
        )
      }
    } catch (e: SecurityException) {
      promise.reject(
        ERROR_UNABLE_TO_LOAD_PERMISSION,
        "Could not get assets: missing audio-library read permission.", e
      )
    } catch (e: IOException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, "Could not read file", e)
    } catch (e: IllegalArgumentException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, e.message ?: "Invalid MediaType", e)
    } catch (e: UnsupportedOperationException) {
      e.printStackTrace()
      promise.reject(ERROR_NO_PERMISSIONS, e.message, e)
    }
  }
}
