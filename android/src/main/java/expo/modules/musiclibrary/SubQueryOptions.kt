package expo.modules.musiclibrary

import expo.modules.kotlin.records.Field
import expo.modules.kotlin.records.Record

data class SubQueryOptions(
  @Field val first: Double,
  @Field val after: String?,
  @Field val sortBy: List<String>
) : Record
