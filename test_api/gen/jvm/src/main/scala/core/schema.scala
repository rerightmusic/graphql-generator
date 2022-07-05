/*
* This file has been generated don't modify here
*/

package core

import caliban.schema.ArgBuilder

import graphql.given
import graphql.*

object Types {

  final case class SearchQuery(keywords: String, orderBy: String)

}


given typesSearchQuery: Schema[Any, Types.SearchQuery] = Schema.gen
given argTypesSearchQuery: ArgBuilder[Types.SearchQuery] = ArgBuilder.gen

