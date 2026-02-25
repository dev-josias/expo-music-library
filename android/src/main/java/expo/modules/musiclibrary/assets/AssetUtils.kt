package expo.modules.musiclibrary.assets

import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import androidx.annotation.RequiresApi
import expo.modules.musiclibrary.ASSET_PROJECTION
import expo.modules.musiclibrary.models.Asset
import java.io.IOException
import androidx.core.net.toUri

/**
 * Reads given `cursor` and saves the data to `response` param.
 * Reads `limit` rows, starting by `offset`.
 * Cursor must be a result of query with [ASSET_PROJECTION] projection
 */
@RequiresApi(Build.VERSION_CODES.R)
@Throws(IOException::class, UnsupportedOperationException::class)
fun putAssetsInfo(
    cursor: Cursor,
    response: MutableList<Bundle>,
    limit: Int,
    offset: Int
) {
    val idIndex = cursor.getColumnIndex(MediaStore.Audio.Media._ID)
    val titleIndex = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE)
    val artistIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST)
    val filenameIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
    val creationDateIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED)
    val modificationDateIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)
    val durationIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION)
    val localUriIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
    val albumIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID)
    val artistIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST_ID)
    val genreIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.GENRE_ID)

    if (!cursor.moveToPosition(offset)) {
        return
    }

    var i = 0
    while (i < limit && !cursor.isAfterLast) {
        val assetId = cursor.getString(idIndex)
        val path = cursor.getString(localUriIndex)
        val localUri = "file://$path"
        val artworkUri: Uri = "content://media/external/audio/media/${assetId}/albumart".toUri()

        val title = if (titleIndex != -1) cursor.getString(titleIndex) else cursor.getString(filenameIndex)

        val asset = Bundle().apply {
            putString("id", assetId)
            putString("title", title)
            putString("artist", cursor.getString(artistIndex))
            putString("artwork", artworkUri.toString())
            putString("filename", cursor.getString(filenameIndex))
            putString("uri", localUri)
            putString("mediaType", "audio")
            putLong("creationTime", cursor.getLong(creationDateIndex))
            putDouble("modificationTime", cursor.getLong(modificationDateIndex) * 1000.0)
            putDouble("duration", cursor.getInt(durationIndex) / 1000.0)
            putString("albumId", cursor.getString(albumIdIndex))
            putString("artistId", cursor.getString(artistIdIndex))
            putString("genreId", if (genreIdIndex != -1) cursor.getString(genreIdIndex) else null)
        }

        cursor.moveToNext()
        response.add(asset)
        i++
    }
}

@RequiresApi(Build.VERSION_CODES.R)
@Throws(IOException::class, UnsupportedOperationException::class)
fun fillAssetBundle(
    cursor: Cursor,
    assets: HashMap<String, Asset>
) {
    val idIndex = cursor.getColumnIndex(MediaStore.Audio.Media._ID)
    val titleIndex = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE)
    val artistIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST)
    val filenameIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
    val creationDateIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED)
    val modificationDateIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)
    val durationIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION)
    val localUriIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
    val albumIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID)
    val artistIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST_ID)
    val genreIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.GENRE_ID)

    while (cursor.moveToNext()) {
        val assetId = cursor.getString(idIndex)
        val path = cursor.getString(localUriIndex)
        val localUri = "file://$path"
        val artworkUri: Uri = "content://media/external/audio/media/${assetId}/albumart".toUri()

        val title = if (titleIndex != -1) cursor.getString(titleIndex) else cursor.getString(filenameIndex)

        Asset(
            id = assetId,
            title = title,
            artist = cursor.getString(artistIndex),
            artwork = artworkUri.toString(),
            filename = cursor.getString(filenameIndex),
            localUri = localUri,
            mediaType = "audio",
            creationTime = cursor.getLong(creationDateIndex),
            modificationTime = cursor.getLong(modificationDateIndex) * 1000.0,
            duration = cursor.getInt(durationIndex) / 1000.0,
            albumId = cursor.getString(albumIdIndex),
            artistId = cursor.getString(artistIdIndex),
            genreId = if (genreIdIndex != -1) cursor.getString(genreIdIndex) else null
        ).also {
            assets[assetId] = it
        }
    }
}

