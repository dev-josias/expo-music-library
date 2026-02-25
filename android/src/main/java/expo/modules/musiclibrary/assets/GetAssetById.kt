package expo.modules.musiclibrary.assets

import android.content.Context
import android.os.Bundle
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.ASSET_PROJECTION
import expo.modules.musiclibrary.AssetQueryException
import expo.modules.musiclibrary.ERROR_NO_PERMISSIONS
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import expo.modules.musiclibrary.EXTERNAL_CONTENT_URI
import java.io.IOException

internal class GetAssetById(
  private val context: Context,
  private val assetId: String,
  private val promise: Promise
) {
  fun execute() {
    val contentResolver = context.contentResolver
    val selection = "${MediaStore.Audio.Media._ID} = ?"
    val selectionArgs = arrayOf(assetId)

    try {
      contentResolver.query(
        EXTERNAL_CONTENT_URI,
        ASSET_PROJECTION,
        selection,
        selectionArgs,
        null
      ).use { cursor ->
        if (cursor == null) throw AssetQueryException()

        val assets = ArrayList<Bundle>()
        putAssetsInfo(cursor, assets, 1, 0)

        if (assets.isEmpty()) {
          promise.reject("E_ASSET_NOT_FOUND", "Asset with id $assetId not found.", null)
          return
        }
        promise.resolve(assets[0])
      }
    } catch (e: SecurityException) {
      promise.reject(ERROR_UNABLE_TO_LOAD_PERMISSION, "Could not get asset: need READ_EXTERNAL_STORAGE permission.", e)
    } catch (e: IOException) {
      promise.reject(ERROR_UNABLE_TO_LOAD, "Could not read file", e)
    } catch (e: UnsupportedOperationException) {
      promise.reject(ERROR_NO_PERMISSIONS, e.message, e)
    }
  }
}
