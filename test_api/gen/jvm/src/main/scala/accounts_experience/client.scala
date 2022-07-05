/*
* This file has been generated don't modify here
*/

package accounts_experience

import caliban.client.FieldBuilder._
import caliban.client._
import caliban.client.__Value._

object client {

  type Account
  object Account {
    def id: SelectionBuilder[Account, String] =
      _root_.caliban.client.SelectionBuilder.Field("id", Scalar())
    def email: SelectionBuilder[Account, String] =
      _root_.caliban.client.SelectionBuilder.Field("email", Scalar())
    def pass: SelectionBuilder[Account, String] =
      _root_.caliban.client.SelectionBuilder.Field("pass", Scalar())
  }

  final case class SearchQuery(keywords: String, orderBy: String)
  object SearchQuery {
    implicit val encoder: ArgEncoder[SearchQuery] =
      new ArgEncoder[SearchQuery] {
        override def encode(value: SearchQuery): __Value =
          __ObjectValue(
            List(
              "keywords" -> implicitly[ArgEncoder[String]]
                .encode(value.keywords),
              "orderBy" -> implicitly[ArgEncoder[String]].encode(value.orderBy)
            )
          )
      }
  }
  type Query = _root_.caliban.client.Operations.RootQuery
  object Query {
    def getAccount[A](
        id: Option[String] = None
    )(innerSelection: SelectionBuilder[Account, A])(implicit
        encoder0: ArgEncoder[Option[String]]
    ): SelectionBuilder[_root_.caliban.client.Operations.RootQuery, Option[A]] =
      _root_.caliban.client.SelectionBuilder.Field(
        "getAccount",
        OptionOf(Obj(innerSelection)),
        arguments = List(Argument("id", id, "AccountId")(encoder0))
      )
    def searchAccounts[A](
        searchQuery: SearchQuery
    )(innerSelection: SelectionBuilder[Account, A])(implicit
        encoder0: ArgEncoder[SearchQuery]
    ): SelectionBuilder[_root_.caliban.client.Operations.RootQuery, List[A]] =
      _root_.caliban.client.SelectionBuilder.Field(
        "searchAccounts",
        ListOf(Obj(innerSelection)),
        arguments =
          List(Argument("searchQuery", searchQuery, "SearchQuery!")(encoder0))
      )
  }

  type Mutation = _root_.caliban.client.Operations.RootMutation
  object Mutation {
    def createAccount(email: String, pass: String)(implicit
        encoder0: ArgEncoder[String],
        encoder1: ArgEncoder[String]
    ): SelectionBuilder[_root_.caliban.client.Operations.RootMutation, String] =
      _root_.caliban.client.SelectionBuilder.Field(
        "createAccount",
        Scalar(),
        arguments = List(
          Argument("email", email, "Email!")(encoder0),
          Argument("pass", pass, "String!")(encoder1)
        )
      )
  }

}
