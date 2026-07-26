package expo.modules.musiclibrary.genres

import android.content.Context
import android.database.Cursor.FIELD_TYPE_NULL
import android.os.Bundle
import android.provider.MediaStore
import android.provider.MediaStore.Audio.Genres
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.AlbumException
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import expo.modules.musiclibrary.GENRE_PROJECTION

internal open class GetGenres(
    private val context: Context,
    private val promise: Promise
) {
    fun execute() {
        val genres = ArrayList<Genre>()

        try {
            // First pass: get all genres (id + name)
            context.contentResolver
                .query(
                    Genres.EXTERNAL_CONTENT_URI,
                    GENRE_PROJECTION,
                    null,
                    null,
                    "${Genres.NAME} ASC, ${Genres._ID} ASC"
                )
                .use { genreCursor ->
                    if (genreCursor == null) {
                        throw AlbumException("Could not get genres. Query returns null")
                    }
                    val genreIdIndex = genreCursor.getColumnIndex(Genres._ID)
                    val genreDisplayNameIndex = genreCursor.getColumnIndex(Genres.NAME)

                    while (genreCursor.moveToNext()) {
                        val id = genreCursor.getString(genreIdIndex)

                        if (genreCursor.getType(genreDisplayNameIndex) == FIELD_TYPE_NULL) {
                            continue
                        }

                        val numericId = id.toLongOrNull() ?: continue
                        val memberCount = context.contentResolver.query(
                            Genres.Members.getContentUri("external", numericId),
                            arrayOf(Genres.Members.AUDIO_ID),
                            null,
                            null,
                            null
                        )?.use { it.count } ?: 0

                        genres.add(
                            Genre(
                                id = id,
                                title = genreCursor.getString(genreDisplayNameIndex),
                                count = memberCount
                            )
                        )
                    }
                }

            promise.resolve(genres.map { it.toBundle() })
        } catch (e: SecurityException) {
            promise.reject(
                ERROR_UNABLE_TO_LOAD_PERMISSION,
                "Could not get genres: missing audio-library read permission.", e
            )
        } catch (e: RuntimeException) {
            promise.reject(ERROR_UNABLE_TO_LOAD, "Could not get genres.", e)
        }
    }

    private class Genre(private val id: String, private val title: String, private val count: Int) {
        fun toBundle() = Bundle().apply {
            putString("id", id)
            putString("title", title)
            putInt("assetCount", count)
        }
    }
}
