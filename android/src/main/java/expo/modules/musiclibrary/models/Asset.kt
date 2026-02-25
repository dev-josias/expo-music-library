package expo.modules.musiclibrary.models

import android.os.Bundle

class Asset (
    private val id: String,
    private val title: String,
    private val artist: String,
    private val artwork: String,
    private val filename: String,
    private val localUri: String,
    private val mediaType: String,
    private val creationTime: Long,
    private val modificationTime: Double,
    private val duration: Double,
    private val albumId: String,
    private val artistId: String,
    private val genreId: String?,
) {
    fun toBundle() = Bundle().apply {
        putString("id", id)
        putString("title", title)
        putString("artist", artist)
        putString("artwork", artwork)
        putString("filename", filename)
        putString("uri", localUri)
        putString("mediaType", mediaType)
        putLong("creationTime", creationTime)
        putDouble("modificationTime", modificationTime)
        putDouble("duration", duration)
        putString("albumId", albumId)
        putString("artistId", artistId)
        putString("genreId", genreId)
    }
}