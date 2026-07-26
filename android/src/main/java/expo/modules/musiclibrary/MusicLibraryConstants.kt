package expo.modules.musiclibrary

import android.os.Build
import android.provider.MediaStore

const val GET_ASSETS_DEFAULT_LIMIT = 20.0
const val GET_ASSETS_MAX_LIMIT = 1000

const val ERROR_UNABLE_TO_LOAD_PERMISSION = "E_UNABLE_TO_LOAD_PERMISSION"
const val ERROR_UNABLE_TO_SAVE_PERMISSION = "E_UNABLE_TO_SAVE_PERMISSION"
const val ERROR_UNABLE_TO_DELETE = "E_UNABLE_TO_DELETE"
const val ERROR_UNABLE_TO_LOAD = "E_UNABLE_TO_LOAD"
const val ERROR_UNABLE_TO_SAVE = "E_UNABLE_TO_SAVE"
const val ERROR_IO_EXCEPTION = "E_IO_EXCEPTION"
const val ERROR_NO_PERMISSIONS = "E_NO_PERMISSIONS"
const val ERROR_NO_PERMISSIONS_MESSAGE = "Missing MEDIA_LIBRARY permissions."
const val ERROR_NO_WRITE_PERMISSION_MESSAGE = "Missing MEDIA_LIBRARY write permission."
const val ERROR_USER_DID_NOT_GRANT_WRITE_PERMISSIONS_MESSAGE = "User didn't grant write permission to requested files."

val EXTERNAL_CONTENT_URI = MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

val ASSET_PROJECTION: Array<String> = buildList {
  add(MediaStore.Audio.Media._ID)
  add(MediaStore.Audio.Media.TITLE)
  add(MediaStore.Audio.Media.ARTIST)
  add(MediaStore.Audio.Media.ALBUM)
  add(MediaStore.Audio.Media.DISPLAY_NAME)
  add(MediaStore.Audio.Media.DATE_ADDED)
  add(MediaStore.Audio.Media.DATE_MODIFIED)
  add(MediaStore.Audio.Media.DURATION)
  add(MediaStore.Audio.Media.MIME_TYPE)
  add(MediaStore.Audio.Media.SIZE)
  add(MediaStore.Audio.Media.TRACK)
  add(MediaStore.Audio.Media.ALBUM_ID)
  add(MediaStore.Audio.Media.ARTIST_ID)
  // These columns were added to MediaStore in Android 11.
  if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
    add(MediaStore.Audio.Media.GENRE_ID)
    add(MediaStore.Audio.Media.DISC_NUMBER)
    add(MediaStore.Audio.Media.IS_DRM)
  }
  // DATA is used only to implement the directory fallback below Android 10.
  if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
    add(MediaStore.Audio.Media.DATA)
  }
}.toTypedArray()

val GENRE_ASSET_PROJECTION: Array<String> = ASSET_PROJECTION
  .filterNot { it == MediaStore.Audio.Media._ID }
  .let { listOf(MediaStore.Audio.Genres.Members.AUDIO_ID) + it }
  .toTypedArray()

val ALBUM_PROJECTION = arrayOf(
  MediaStore.Audio.Albums._ID,
  MediaStore.Audio.Albums.ALBUM,
  MediaStore.Audio.Albums.ARTIST,
  MediaStore.Audio.Albums.NUMBER_OF_SONGS
)

val ARTIST_PROJECTION = arrayOf(
  MediaStore.Audio.Artists._ID,
  MediaStore.Audio.Artists.ARTIST,
  MediaStore.Audio.Artists.NUMBER_OF_TRACKS,
)

val GENRE_PROJECTION = arrayOf(
  MediaStore.Audio.Genres._ID,
  MediaStore.Audio.Genres.NAME,
)
