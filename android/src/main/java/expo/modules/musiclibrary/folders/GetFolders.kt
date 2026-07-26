package expo.modules.musiclibrary.folders

import android.content.Context
import android.database.Cursor.FIELD_TYPE_NULL
import android.os.Build
import android.os.Bundle
import android.provider.MediaStore
import expo.modules.kotlin.Promise
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD
import expo.modules.musiclibrary.ERROR_UNABLE_TO_LOAD_PERMISSION
import expo.modules.musiclibrary.FolderException

internal open class GetFolders(
    private val context: Context,
    private val promise: Promise
) {
    fun execute() {
        val supportsBuckets = Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
        val projection = if (supportsBuckets) {
            arrayOf(
                MediaStore.Audio.Media.BUCKET_ID,
                MediaStore.Audio.Media.BUCKET_DISPLAY_NAME
            )
        } else {
            arrayOf(MediaStore.Audio.Media.DATA)
        }

        val folders = HashMap<String, Folder>()

        try {
            context.contentResolver
                .query(
                    MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
                    projection,
                    null,
                    null,
                    if (supportsBuckets) {
                        "${MediaStore.Audio.Media.BUCKET_DISPLAY_NAME} ASC, " +
                            "${MediaStore.Audio.Media._ID} ASC"
                    } else {
                        null
                    },
                )
                .use { foldersCursor ->
                    if (foldersCursor == null) {
                        throw FolderException("Could not get folders. Query returns null")
                    }
                    val bucketIdIndex = if (supportsBuckets) {
                        foldersCursor.getColumnIndex(MediaStore.Audio.Media.BUCKET_ID)
                    } else {
                        -1
                    }
                    val bucketDisplayNameIndex = if (supportsBuckets) {
                        foldersCursor.getColumnIndex(MediaStore.Audio.Media.BUCKET_DISPLAY_NAME)
                    } else {
                        -1
                    }
                    val dataIndex = if (supportsBuckets) {
                        -1
                    } else {
                        foldersCursor.getColumnIndex(MediaStore.Audio.Media.DATA)
                    }

                    // Each row is one audio file — count rows per bucket for assetCount
                    while (foldersCursor.moveToNext()) {
                        val identity = if (supportsBuckets) {
                            if (
                                bucketIdIndex < 0 ||
                                bucketDisplayNameIndex < 0 ||
                                foldersCursor.getType(bucketDisplayNameIndex) == FIELD_TYPE_NULL
                            ) {
                                null
                            } else {
                                FolderIdentity(
                                    id = foldersCursor.getString(bucketIdIndex),
                                    title = foldersCursor.getString(bucketDisplayNameIndex),
                                    path = ""
                                )
                            }
                        } else {
                            if (dataIndex >= 0 && !foldersCursor.isNull(dataIndex)) {
                                legacyFolderIdentity(foldersCursor.getString(dataIndex))
                            } else {
                                null
                            }
                        }
                        if (identity == null) continue

                        val folder = folders[identity.id] ?: Folder(
                            id = identity.id,
                            title = identity.title,
                        ).also {
                            folders[identity.id] = it
                        }
                        folder.count++
                    }
                    promise.resolve(
                        folders.values.sortedBy { it.title.lowercase() }.map { it.toBundle() }
                    )
                }
        } catch (e: SecurityException) {
            promise.reject(
                ERROR_UNABLE_TO_LOAD_PERMISSION,
                "Could not get folders: missing audio-library read permission.", e
            )
        } catch (e: RuntimeException) {
            promise.reject(ERROR_UNABLE_TO_LOAD, "Could not get folders.", e)
        }
    }

    private class Folder(private val id: String, val title: String, var count: Int = 0) {
        fun toBundle() = Bundle().apply {
            putString("id", id)
            putString("title", title)
            putInt("assetCount", count)
        }
    }
}
