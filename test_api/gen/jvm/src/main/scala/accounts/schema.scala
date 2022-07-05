/*
* This file has been generated don't modify here
*/

package accounts

import caliban.schema.ArgBuilder

import graphql.given
import graphql.*
import core.Types.*
import core.given

object Types {

  final case class Account(id: String, email: String, pass: String)

}


given typesAccount: Schema[Any, Types.Account] = Schema.gen
given argTypesAccount: ArgBuilder[Types.Account] = ArgBuilder.gen

