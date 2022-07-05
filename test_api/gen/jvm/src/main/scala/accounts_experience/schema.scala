/*
* This file has been generated don't modify here
*/

package accounts_experience

import caliban.schema.ArgBuilder

import Types._

import graphql.given
import graphql.*
import core.Types.*
import core.given
import accounts.Types.*
import accounts.given

object Types {
  final case class QueryGetAccountArgs(id: Option[String])
  final case class QuerySearchAccountsArgs(searchQuery: SearchQuery)
  final case class MutationCreateAccountArgs(email: String, pass: String)

}

object Operations {

  final case class Query[F[_]](
      getAccount: QueryGetAccountArgs => F[Option[Account]],
      searchAccounts: QuerySearchAccountsArgs => F[List[Account]]
  )

  final case class Mutation[F[_]](
      createAccount: MutationCreateAccountArgs => F[String]
  )

}


given typesQueryGetAccountArgs: Schema[Any, Types.QueryGetAccountArgs] = Schema.gen
given argTypesQueryGetAccountArgs: ArgBuilder[Types.QueryGetAccountArgs] = ArgBuilder.gen

given typesQuerySearchAccountsArgs: Schema[Any, Types.QuerySearchAccountsArgs] = Schema.gen
given argTypesQuerySearchAccountsArgs: ArgBuilder[Types.QuerySearchAccountsArgs] = ArgBuilder.gen

given typesMutationCreateAccountArgs: Schema[Any, Types.MutationCreateAccountArgs] = Schema.gen
given argTypesMutationCreateAccountArgs: ArgBuilder[Types.MutationCreateAccountArgs] = ArgBuilder.gen

