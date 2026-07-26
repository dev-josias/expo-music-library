package expo.modules.musiclibrary.artists

import android.content.Context
import android.database.Cursor.FIELD_TYPE_NULL
import android.os.Bundle
import android.provider.MediaStore.Audio.Artists
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.ARTIST_PROJECTION
import expo.modules.musiclibrary.AlbumException
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION

internal open class GetArtists(
    private val context: Context,
    private val promise: Promise
) {
    fun execute() {
        val projection = ARTIST_PROJECTION

        val artists = HashMap<String, Artist>()

        try {
            context.contentResolver
                .query(
                    Artists.EXTERNAL_CONTENT_URI,
                    projection,
                    null,
                    null,
                    "${Artists.ARTIST} ASC, ${Artists._ID} ASC"
                )
                .use { artistCursor ->
                    if (artistCursor == null) {
                        throw AlbumException("Could not get artists. Query returns null")
                    }
                    val artistIdIndex = artistCursor.getColumnIndex(Artists._ID)
                    val artistDisplayNameIndex = artistCursor.getColumnIndex(Artists.ARTIST)
                    val artistSongsIndex = artistCursor.getColumnIndex(Artists.NUMBER_OF_TRACKS)

                    while (artistCursor.moveToNext()) {
                        val id = artistCursor.getString(artistIdIndex)

                        if (artistCursor.getType(artistDisplayNameIndex) == FIELD_TYPE_NULL) {
                            continue
                        }

                        if (artists[id] == null) {
                            artists[id] = Artist(
                                id = id,
                                title = artistCursor.getString(artistDisplayNameIndex),
                                artistSongs = artistCursor.getInt(artistSongsIndex),
                                count = artistCursor.getInt(artistSongsIndex)
                            )
                        }
                    }

                    promise.resolve(artists.values.sortedBy { it.title }.map { it.toBundle() })
                }
        } catch (e: SecurityException) {
            promise.reject(
                ERROR_UNABLE_TO_LOAD_PERMISSION,
                "Could not get artists: need READ_EXTERNAL_STORAGE permission.", e
            )
        } catch (e: RuntimeException) {
            promise.reject(ERROR_UNABLE_TO_LOAD, "Could not get artists.", e)
        }
    }

    private class Artist(private val id: String, val title: String, var count: Int = 0, private val artistSongs:Int) {
        fun toBundle() = Bundle().apply {
            putString("id", id)
            putString("title", title)
            putParcelable("type", null)
            putInt("assetCount", count)
            putInt("albumSongs", artistSongs)
        }
    }
}
