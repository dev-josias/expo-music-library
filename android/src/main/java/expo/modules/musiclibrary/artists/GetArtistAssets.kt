package expo.modules.musiclibrary.artists

import android.content.Context
import android.os.Bundle
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.ASSET_PROJECTION
import expo.modules.musiclibrary.AssetQueryException
import expo.modules.musiclibrary.ERROR_NO_PERMISSIONS
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import expo.modules.musiclibrary.SubQueryOptions
import expo.modules.musiclibrary.assets.convertOrderDescriptors
import expo.modules.musiclibrary.assets.putAssetsInfo
import java.io.IOException

internal class GetArtistAssets(
  private val context: Context,
  private val artistId: String,
  private val options: SubQueryOptions,
  private val promise: Promise
) {
  fun execute() {
    val contentResolver = context.contentResolver
    val selection = "${MediaStore.Audio.Media.ARTIST_ID} = ?"
    val selectionArgs = arrayOf(artistId)
    val order = if (options.sortBy.isNotEmpty()) convertOrderDescriptors(options.sortBy)
                else "${MediaStore.Audio.Media.DISPLAY_NAME} ASC"
    val limit = options.first.toInt()
    val offset = options.after?.toIntOrNull() ?: 0

    try {
      contentResolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        ASSET_PROJECTION,
        selection,
        selectionArgs,
        order
      ).use { assetsCursor ->
        if (assetsCursor == null) throw AssetQueryException()

        val assetsInfo = ArrayList<Bundle>()
        putAssetsInfo(assetsCursor, assetsInfo, limit, offset)

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
      e.printStackTrace()
      promise.reject(ERROR_NO_PERMISSIONS, e.message, e)
    }
  }
}
