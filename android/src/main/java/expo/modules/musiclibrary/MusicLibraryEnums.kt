package expo.modules.musiclibrary

import android.provider.MediaStore

enum class SortBy(val keyName: String, val mediaColumnName: String) {
  DEFAULT("default", MediaStore.Audio.Media._ID),
  CREATION_TIME("creationTime", MediaStore.Audio.Media.DATE_ADDED),
  MODIFICATION_TIME("modificationTime", MediaStore.Audio.Media.DATE_MODIFIED),
  DURATION("duration", MediaStore.Audio.AudioColumns.DURATION),
  TITLE("title", MediaStore.Audio.Media.TITLE),
  ARTIST("artist", MediaStore.Audio.Media.ARTIST),
  ALBUM("album", MediaStore.Audio.Media.ALBUM);

  companion object {
    // all constants have keys equal to the values
    fun getConstants() = entries.associate { Pair(it.keyName, it.keyName) }

    fun fromKeyName(keyName: String) = entries.find { it.keyName == keyName }
  }
}