package expo.modules.musiclibrary.genres

import android.annotation.SuppressLint
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
    @SuppressLint("InlinedApi")
    fun execute() {
        val genres = HashMap<String, Genre>()

        try {
            // First pass: get all genres (id + name)
            context.contentResolver
                .query(
                    Genres.EXTERNAL_CONTENT_URI,
                    GENRE_PROJECTION,
                    null,
                    null,
                    "${Genres.NAME} ASC"
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

                        genres[id] = Genre(
                            id = id,
                            title = genreCursor.getString(genreDisplayNameIndex),
                        )
                    }
                }

            // Second pass: count songs per genre from audio media table
            context.contentResolver
                .query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    arrayOf(MediaStore.Audio.Media.GENRE_ID),
                    "${MediaStore.Files.FileColumns.MEDIA_TYPE} = ${MediaStore.Files.FileColumns.MEDIA_TYPE_AUDIO}",
                    null,
                    null
                )
                .use { mediaCursor ->
                    if (mediaCursor != null) {
                        val genreIdIndex = mediaCursor.getColumnIndex(MediaStore.Audio.Media.GENRE_ID)
                        while (mediaCursor.moveToNext()) {
                            val gId = mediaCursor.getString(genreIdIndex) ?: continue
                            genres[gId]?.count = (genres[gId]?.count ?: 0) + 1
                        }
                    }
                }

            promise.resolve(genres.values.map { it.toBundle() })
        } catch (e: SecurityException) {
            promise.reject(
                ERROR_UNABLE_TO_LOAD_PERMISSION,
                "Could not get genres: need READ_EXTERNAL_STORAGE permission.", e
            )
        } catch (e: RuntimeException) {
            promise.reject(ERROR_UNABLE_TO_LOAD, "Could not get genres.", e)
        }
    }

    private class Genre(private val id: String, private val title: String, var count: Int = 0) {
        fun toBundle() = Bundle().apply {
            putString("id", id)
            putString("title", title)
            putInt("assetCount", count)
        }
    }
}
