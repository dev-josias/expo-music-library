package expo.modules.musiclibrary.assets

import android.content.Context
import android.os.Bundle
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.ASSET_PROJECTION
import expo.modules.musiclibrary.AssetQueryException
import expo.modules.musiclibrary.AssetsOptions
import expo.modules.musiclibrary.ERROR_NO_PERMISSIONS
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import expo.modules.musiclibrary.EXTERNAL_CONTENT_URI
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
      val (baseSelection, order, limit, offset) = getQueryFromOptions(assetsOptions)

      // Build search clause using ? placeholders for safety
      val searchPart = "(${MediaStore.Audio.Media.TITLE} LIKE ? OR " +
        "${MediaStore.Audio.Media.ARTIST} LIKE ? OR " +
        "${MediaStore.Audio.Media.ALBUM} LIKE ?)"
      val searchArgs = arrayOf("%$query%", "%$query%", "%$query%")

      val fullSelection = if (baseSelection.isNotEmpty()) "$searchPart AND $baseSelection" else searchPart

      contentResolver.query(
        EXTERNAL_CONTENT_URI,
        ASSET_PROJECTION,
        fullSelection,
        searchArgs,
        order
      ).use { assetsCursor ->
        if (assetsCursor == null) throw AssetQueryException()

        val assetsInfo = ArrayList<Bundle>()
        putAssetsInfo(assetsCursor, assetsInfo, limit.toInt(), offset)

        val response = Bundle().apply {
          putParcelableArrayList("assets", assetsInfo)
          putBoolean("hasNextPage", !assetsCursor.isAfterLast)
          putString("endCursor", assetsCursor.position.toString())
          putInt("totalCount", assetsCursor.count)
        }
        promise.resolve(response)
      }
    } catch (e: SecurityException) {
      promise.reject(ERROR_UNABLE_TO_LOAD_PERMISSION, "Could not get assets: need READ_EXTERNAL_STORAGE permission.", e)
    } catch (e: IOException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, "Could not read file", e)
    } catch (e: IllegalArgumentException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, e.message ?: "Invalid option", e)
    } catch (e: UnsupportedOperationException) {
      promise.reject(ERROR_NO_PERMISSIONS, e.message, e)
    }
  }
}
