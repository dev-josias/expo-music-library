package expo.modules.musiclibrary.folders

import android.content.Context
import android.provider.MediaStore
import java.io.File
import java.util.Locale

internal data class FolderIdentity(
    val id: String,
    val title: String,
    val path: String
)

internal data class FolderSelection(
    val clause: String,
    val args: Array<String>
)

internal fun legacyFolderIdentity(dataPath: String?): FolderIdentity? {
    val parent = dataPath
        ?.let(::File)
        ?.parentFile
        ?.absolutePath
        ?: return null
    val id = parent.lowercase(Locale.ROOT).hashCode().toString()
    val title = File(parent).name.takeIf { it.isNotBlank() } ?: parent
    return FolderIdentity(id, title, parent)
}

internal fun legacyFolderSelection(context: Context, folderId: String): FolderSelection {
    var matchingPath: String? = null
    context.contentResolver.query(
        MediaStore.Audio.Media.EXTERNAL_CONTENT_URI,
        arrayOf(MediaStore.Audio.Media.DATA),
        null,
        null,
        null
    )?.use { cursor ->
        val dataIndex = cursor.getColumnIndex(MediaStore.Audio.Media.DATA)
        while (cursor.moveToNext()) {
            val identity = if (dataIndex >= 0 && !cursor.isNull(dataIndex)) {
                legacyFolderIdentity(cursor.getString(dataIndex))
            } else {
                null
            }
            if (identity?.id == folderId) {
                matchingPath = identity.path
                return@use
            }
        }
    }

    val folderPath = matchingPath
        ?: return FolderSelection(
            "${MediaStore.Audio.Media._ID} = ?",
            arrayOf("-1")
        )
    val prefix = "$folderPath/"
    return FolderSelection(
        "substr(${MediaStore.Audio.Media.DATA}, 1, ?) = ? AND " +
            "instr(substr(${MediaStore.Audio.Media.DATA}, ?), '/') = 0",
        arrayOf(
            prefix.length.toString(),
            prefix,
            (prefix.length + 1).toString()
        )
    )
}
