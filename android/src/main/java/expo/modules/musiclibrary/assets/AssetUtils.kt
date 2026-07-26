package expo.modules.musiclibrary.assets

import android.annotation.SuppressLint
import android.content.ContentResolver
import android.content.ContentUris
import android.database.Cursor
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import java.io.File
import java.io.IOException

private const val UNKNOWN_TITLE = "Unknown Title"
private const val UNKNOWN_ARTIST = "Unknown Artist"
private const val ALBUM_ART_URI = "content://media/external/audio/albumart"

internal fun getAlbumArtworkUri(
    contentResolver: ContentResolver,
    albumId: Long
): String? {
    if (albumId <= 0) return null

    val artworkUri = ContentUris.withAppendedId(
        Uri.parse(ALBUM_ART_URI),
        albumId
    )
    return try {
        contentResolver.openAssetFileDescriptor(artworkUri, "r")?.use {
            artworkUri.toString()
        }
    } catch (_: Exception) {
        null
    }
}

private fun Cursor.stringOrNull(index: Int): String? {
    return if (index >= 0 && !isNull(index)) getString(index) else null
}

private fun Cursor.longOrNull(index: Int): Long? {
    return if (index >= 0 && !isNull(index)) getLong(index) else null
}

/**
 * Reads at most [limit] rows from [cursor], beginning at [offset], and appends
 * normalized JavaScript-facing asset bundles to [response].
 */
@SuppressLint("InlinedApi")
@Throws(IOException::class, UnsupportedOperationException::class)
internal fun putAssetsInfo(
    contentResolver: ContentResolver,
    cursor: Cursor,
    response: MutableList<Bundle>,
    limit: Int,
    offset: Int,
    artworkMode: ArtworkMode = ArtworkMode.URI,
    queriedGenreId: String? = null
) {
    val genreMemberAudioIdIndex = cursor.getColumnIndex(
        MediaStore.Audio.Genres.Members.AUDIO_ID
    )
    val idIndex = genreMemberAudioIdIndex.takeIf { it >= 0 }
        ?: cursor.getColumnIndex(MediaStore.Audio.Media._ID)
    val titleIndex = cursor.getColumnIndex(MediaStore.Audio.Media.TITLE)
    val artistIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST)
    val albumIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM)
    val filenameIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DISPLAY_NAME)
    val creationDateIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_ADDED)
    val modificationDateIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATE_MODIFIED)
    val durationIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DURATION)
    val mimeTypeIndex = cursor.getColumnIndex(MediaStore.Audio.Media.MIME_TYPE)
    val fileSizeIndex = cursor.getColumnIndex(MediaStore.Audio.Media.SIZE)
    val trackIndex = cursor.getColumnIndex(MediaStore.Audio.Media.TRACK)
    val albumIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ALBUM_ID)
    val artistIdIndex = cursor.getColumnIndex(MediaStore.Audio.Media.ARTIST_ID)
    val genreIdIndex = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        cursor.getColumnIndex(MediaStore.Audio.Media.GENRE_ID)
    } else {
        -1
    }
    val discNumberIndex = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        cursor.getColumnIndex(MediaStore.Audio.Media.DISC_NUMBER)
    } else {
        -1
    }
    val drmIndex = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
        cursor.getColumnIndex(MediaStore.Audio.Media.IS_DRM)
    } else {
        -1
    }
    val dataIndex = if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
        cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
    } else {
        -1
    }

    require(idIndex >= 0) { "MediaStore query did not return an asset ID." }
    if (!cursor.moveToPosition(offset)) {
        return
    }

    var itemCount = 0
    val artworkCache = mutableMapOf<Long, String?>()
    while (itemCount < limit && !cursor.isAfterLast) {
        val assetId = cursor.getLong(idIndex)
        val contentUri = ContentUris.withAppendedId(
            MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
            assetId
        ).toString()
        val title = cursor.stringOrNull(titleIndex)
            ?: cursor.stringOrNull(filenameIndex)
            ?: UNKNOWN_TITLE
        val filename = cursor.stringOrNull(filenameIndex) ?: title
        val artist = cursor.stringOrNull(artistIndex) ?: UNKNOWN_ARTIST
        val albumId = cursor.longOrNull(albumIdIndex)
        val artworkUri = albumId
            ?.takeIf { it > 0 && artworkMode == ArtworkMode.URI }
            ?.let { id ->
                if (artworkCache.containsKey(id)) {
                    artworkCache[id]
                } else {
                    getAlbumArtworkUri(contentResolver, id).also {
                        artworkCache[id] = it
                    }
                }
            }
        val legacyFileUri = cursor.stringOrNull(dataIndex)
            ?.takeIf { it.isNotBlank() }
            ?.let { Uri.fromFile(File(it)).toString() }
        val legacyUri = legacyFileUri ?: contentUri

        val rawTrackNumber = cursor.longOrNull(trackIndex) ?: 0L
        val explicitDiscNumber = cursor.longOrNull(discNumberIndex)
        val discNumber = explicitDiscNumber
            ?: rawTrackNumber.takeIf { it >= 1000L }?.div(1000L)
            ?: 0L
        val trackNumber = if (rawTrackNumber >= 1000L) {
            rawTrackNumber % 1000L
        } else {
            rawTrackNumber
        }
        val isProtected = cursor.longOrNull(drmIndex) == 1L

        response.add(
            Bundle().apply {
                putString("id", assetId.toString())
                putString("title", title)
                putString("artist", artist)
                putString("albumTitle", cursor.stringOrNull(albumIndex))
                putString("filename", filename)
                // Preserve the 1.x file URI on Android 9 and older, where DATA
                // remains available. Scoped-storage releases use content URIs.
                putString("uri", legacyUri)
                putString("assetUrl", contentUri)
                putString("contentUri", contentUri)
                putString("uriKind", if (legacyFileUri != null) "file" else "content")
                putString("mediaType", "audio")
                putInt("width", 0)
                putInt("height", 0)
                putDouble(
                    "creationTime",
                    (cursor.longOrNull(creationDateIndex) ?: 0L) * 1000.0
                )
                putDouble(
                    "modificationTime",
                    (cursor.longOrNull(modificationDateIndex) ?: 0L) * 1000.0
                )
                putDouble(
                    "duration",
                    (cursor.longOrNull(durationIndex) ?: 0L) / 1000.0
                )
                putString("mimeType", cursor.stringOrNull(mimeTypeIndex))
                putDouble("fileSize", (cursor.longOrNull(fileSizeIndex) ?: 0L).toDouble())
                putLong("trackNumber", trackNumber)
                putLong("discNumber", discNumber)
                putString("albumId", albumId?.toString())
                putString("artistId", cursor.longOrNull(artistIdIndex)?.toString())
                putString(
                    "genreId",
                    queriedGenreId ?: cursor.longOrNull(genreIdIndex)?.toString()
                )
                putString("artwork", artworkUri ?: "")
                putString("artworkUri", artworkUri)
                putBoolean("hasAssetUrl", true)
                putBoolean("hasLocalAssetURL", true)
                putBoolean("canAccessWithAVFoundation", !isProtected)
                putBoolean("isCloudItem", false)
                putBoolean("hasProtectedAsset", isProtected)
                putBoolean("isLocallyAvailable", !isProtected)
                putBoolean("isPlayable", !isProtected)
                putString("availability", if (isProtected) "protected" else "local")
                putString("availabilityReason", if (isProtected) "protected" else null)
            }
        )

        cursor.moveToNext()
        itemCount++
    }
}

internal fun createPagedResponse(
    contentResolver: ContentResolver,
    cursor: Cursor,
    limit: Int,
    offset: Int,
    artworkMode: ArtworkMode,
    queriedGenreId: String? = null
): Bundle {
    val assetsInfo = ArrayList<Bundle>()
    putAssetsInfo(
        contentResolver,
        cursor,
        assetsInfo,
        limit,
        offset,
        artworkMode,
        queriedGenreId
    )
    val nextOffset = offset + assetsInfo.size

    return Bundle().apply {
        putParcelableArrayList("assets", assetsInfo)
        putBoolean("hasNextPage", nextOffset < cursor.count)
        putString("endCursor", nextOffset.toString())
        putInt("totalCount", cursor.count)
    }
}
