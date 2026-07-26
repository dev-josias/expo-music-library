package expo.modules.musiclibrary.assets

import android.net.Uri
import android.os.Build
import android.provider.MediaStore
import expo.modules.core.utilities.ifNull
import expo.modules.musiclibrary.ASSET_PROJECTION
import expo.modules.musiclibrary.AssetsOptions
import expo.modules.musiclibrary.GET_ASSETS_MAX_LIMIT
import expo.modules.musiclibrary.GENRE_ASSET_PROJECTION
import expo.modules.musiclibrary.SortBy

internal data class GetAssetsQuery(
    val contentUri: Uri,
    val projection: Array<String>,
    val selection: String?,
    val selectionArgs: Array<String>,
    val order: String,
    val limit: Int,
    val offset: Int,
    val artworkMode: ArtworkMode,
)

internal enum class ArtworkMode {
    URI,
    NONE
}

internal data class PaginationOptions(
    val limit: Int,
    val offset: Int,
    val artworkMode: ArtworkMode
)

@Throws(IllegalArgumentException::class)
internal fun getQueryFromOptions(input: AssetsOptions): GetAssetsQuery {
    val pagination = getPaginationOptions(
        input.first,
        input.after,
        input.availability,
        input.artwork
    )
    val (selection, selectionArgs) = createSelection(input)
    val contentUri = input.genre?.let { genreId ->
        val parsedGenreId = genreId.toLongOrNull()
        require(parsedGenreId != null && parsedGenreId >= 0) {
            "Genre ID must be a non-negative integer."
        }
        MediaStore.Audio.Genres.Members.getContentUri("external", parsedGenreId)
    } ?: MediaStore.Audio.Media.EXTERNAL_CONTENT_URI

    return GetAssetsQuery(
        contentUri = contentUri,
        projection = if (input.genre == null) ASSET_PROJECTION else GENRE_ASSET_PROJECTION,
        selection = selection,
        selectionArgs = selectionArgs,
        order = stableOrder(input.sortBy),
        limit = pagination.limit,
        offset = pagination.offset,
        artworkMode = pagination.artworkMode
    )
}

@Throws(IllegalArgumentException::class)
private fun createSelection(input: AssetsOptions): Pair<String?, Array<String>> {
    val clauses = mutableListOf<String>()
    val selectionArgs = mutableListOf<String>()

    input.album?.let { albumId ->
        clauses.add("${MediaStore.Audio.Media.ALBUM_ID} = ?")
        selectionArgs.add(albumId)
    }

    input.artist?.let { artistId ->
        clauses.add("${MediaStore.Audio.Media.ARTIST_ID} = ?")
        selectionArgs.add(artistId)
    }

    input.createdAfter?.let { createdAfter ->
        require(createdAfter.isFinite()) {
            "createdAfter must be a finite Unix timestamp in milliseconds."
        }
        clauses.add("${MediaStore.Audio.Media.DATE_ADDED} > ?")
        selectionArgs.add((createdAfter / 1000.0).toString())
    }

    input.createdBefore?.let { createdBefore ->
        require(createdBefore.isFinite()) {
            "createdBefore must be a finite Unix timestamp in milliseconds."
        }
        clauses.add("${MediaStore.Audio.Media.DATE_ADDED} < ?")
        selectionArgs.add((createdBefore / 1000.0).toString())
    }

    availabilitySelection(input.availability)?.let(clauses::add)

    return Pair(
        clauses.takeIf { it.isNotEmpty() }?.joinToString(" AND "),
        selectionArgs.toTypedArray()
    )
}

internal fun availabilitySelection(availability: String?): String? {
    return if (
        availability == "avFoundationAccessible" &&
        Build.VERSION.SDK_INT >= Build.VERSION_CODES.R
    ) {
        "(${MediaStore.Audio.Media.IS_DRM} IS NULL OR " +
            "${MediaStore.Audio.Media.IS_DRM} = 0)"
    } else {
        null
    }
}

internal fun combineSelections(vararg clauses: String?): String? {
    return clauses
        .filterNotNull()
        .filter { it.isNotBlank() }
        .takeIf { it.isNotEmpty() }
        ?.joinToString(" AND ")
}

@Throws(IllegalArgumentException::class)
internal fun getPaginationOptions(
    first: Double,
    after: String?,
    availability: String?,
    artwork: String?
): PaginationOptions {
    require(first.isFinite() && first % 1.0 == 0.0) {
        "first must be a finite integer."
    }
    require(first >= 1.0 && first <= GET_ASSETS_MAX_LIMIT.toDouble()) {
        "first must be between 1 and $GET_ASSETS_MAX_LIMIT."
    }

    val offset = after?.let { cursor ->
        val parsedCursor = cursor.toIntOrNull()
        require(parsedCursor != null && parsedCursor >= 0) {
            "after must be a non-negative pagination cursor."
        }
        parsedCursor
    } ?: 0

    require(
        availability == null ||
            availability == "all" ||
            availability == "hasAssetUrl" ||
            availability == "avFoundationAccessible"
    ) {
        "availability must be all, hasAssetUrl, or avFoundationAccessible."
    }

    val artworkMode = when (artwork) {
        null, "legacy", "uri" -> ArtworkMode.URI
        "none" -> ArtworkMode.NONE
        else -> throw IllegalArgumentException("artwork must be legacy, uri, or none.")
    }

    return PaginationOptions(first.toInt(), offset, artworkMode)
}

/**
 * Converts sorting key string to column value defined in [SortBy]
 * @throws IllegalArgumentException if the value is not defined there
 */
@Throws(IllegalArgumentException::class)
fun parseSortByKey(key: String): String =
    SortBy.fromKeyName(key)?.mediaColumnName.ifNull {
        val errorMessage = "SortBy key $key is not supported!"
        throw IllegalArgumentException(errorMessage)
    }

/**
 * Converts orderBy options to a value accepted as `order` parameter of
 * [android.content.ContentResolver.query] method
 *
 * Expected input: List of either:
 * - `String` representing order key, defined in [MediaLibraryConstants.SORT_KEYS]
 * - Two-element tuple (defined as `List[String, Boolean]`), where:
 *    - first element represents order key, defined in [MediaLibraryConstants.SORT_KEYS]
 *    - second element: `true` --> ASC, `false` --> DESC order
 *
 * @throws IllegalArgumentException when conversion fails
 */
@Throws(IllegalArgumentException::class)
fun convertOrderDescriptors(orderDescriptor: List<String>): String {
    val results = ArrayList<String>(20)
    for (item in orderDescriptor) {
        val parts = item.trim().split(Regex("\\s+"))
        require(parts.size == 2) { "Array sortBy in assetsOptions has invalid layout." }

        val key = parseSortByKey(parts[0])
        val order = parts[1].uppercase()
        require(order == "ASC" || order == "DESC") {
            "Sort direction must be ASC or DESC."
        }
        results.add("$key $order")
    }

    if (results.none { it.substringBefore(" ") == MediaStore.Audio.Media._ID }) {
        results.add("${MediaStore.Audio.Media._ID} ASC")
    }

    return results.joinToString(separator = ",")
}

internal fun stableOrder(
    sortBy: List<String>,
    defaultOrder: String = MediaStore.Audio.Media.DEFAULT_SORT_ORDER
): String {
    return if (sortBy.isNotEmpty()) {
        convertOrderDescriptors(sortBy)
    } else {
        "$defaultOrder, ${MediaStore.Audio.Media._ID} ASC"
    }
}
