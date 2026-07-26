package expo.modules.musiclibrary.artists

import android.content.Context
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.ASSET_PROJECTION
import expo.modules.musiclibrary.AssetQueryException
import expo.modules.musiclibrary.ERROR_NO_PERMISSIONS
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import expo.modules.musiclibrary.SubQueryOptions
import expo.modules.musiclibrary.assets.availabilitySelection
import expo.modules.musiclibrary.assets.combineSelections
import expo.modules.musiclibrary.assets.createPagedResponse
import expo.modules.musiclibrary.assets.getPaginationOptions
import expo.modules.musiclibrary.assets.stableOrder
import java.io.IOException

internal class GetArtistAssets(
  private val context: Context,
  private val artistId: String,
  private val options: SubQueryOptions,
  private val promise: Promise
) {
  fun execute() {
    val contentResolver = context.contentResolver

    try {
      val pagination = getPaginationOptions(
        options.first,
        options.after,
        options.availability,
        options.artwork
      )
      contentResolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        ASSET_PROJECTION,
        combineSelections(
          "${MediaStore.Audio.Media.ARTIST_ID} = ?",
          availabilitySelection(options.availability)
        ),
        arrayOf(artistId),
        stableOrder(options.sortBy, "${MediaStore.Audio.Media.DISPLAY_NAME} ASC")
      ).use { assetsCursor ->
        if (assetsCursor == null) throw AssetQueryException()

        promise.resolve(
          createPagedResponse(
            contentResolver,
            assetsCursor,
            pagination.limit,
            pagination.offset,
            pagination.artworkMode
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
      e.printStackTrace()
      promise.reject(ERROR_NO_PERMISSIONS, e.message, e)
    }
  }
}
