package expo.modules.musiclibrary.assets

import android.content.Context
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.AssetQueryException
import expo.modules.musiclibrary.AssetsOptions
import expo.modules.musiclibrary.ERROR_NO_PERMISSIONS
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import java.io.IOException

internal class GetSearchAssets(
  private val context: Context,
  private val query: String,
  private val assetsOptions: AssetsOptions,
  private val promise: Promise
) {
  fun execute() {
    val contentResolver = context.contentResolver
    try {
      val assetsQuery = getQueryFromOptions(assetsOptions)

      // Build search clause using ? placeholders for safety
      val searchPart = "(${MediaStore.Audio.Media.TITLE} LIKE ? OR " +
        "${MediaStore.Audio.Media.ARTIST} LIKE ? OR " +
        "${MediaStore.Audio.Media.ALBUM} LIKE ?)"
      val searchArgs = arrayOf("%$query%", "%$query%", "%$query%")

      val fullSelection = assetsQuery.selection
        ?.let { "$searchPart AND $it" }
        ?: searchPart
      val fullSelectionArgs = searchArgs + assetsQuery.selectionArgs

      contentResolver.query(
        assetsQuery.contentUri,
        assetsQuery.projection,
        fullSelection,
        fullSelectionArgs,
        assetsQuery.order
      ).use { assetsCursor ->
        if (assetsCursor == null) throw AssetQueryException()

        promise.resolve(
          createPagedResponse(
            contentResolver,
            assetsCursor,
            assetsQuery.limit,
            assetsQuery.offset,
            assetsQuery.artworkMode,
            assetsOptions.genre
          )
        )
      }
    } catch (e: SecurityException) {
      promise.reject(ERROR_UNABLE_TO_LOAD_PERMISSION, "Could not get assets: missing audio-library read permission.", e)
    } catch (e: IOException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, "Could not read file", e)
    } catch (e: IllegalArgumentException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, e.message ?: "Invalid option", e)
    } catch (e: UnsupportedOperationException) {
      promise.reject(ERROR_NO_PERMISSIONS, e.message, e)
    }
  }
}
