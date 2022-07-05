/*
 * This file has been generated don't modify here
 */
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
  AccountId: string;
  Email: string;
};

export type Account = {
  __typename?: 'Account';
  email: Scalars['Email'];
  id: Scalars['AccountId'];
  pass: Scalars['String'];
};

export type Mutation = {
  __typename?: 'Mutation';
  createAccount: Scalars['AccountId'];
};


export type MutationCreateAccountArgs = {
  email: Scalars['Email'];
  pass: Scalars['String'];
};

export type Query = {
  __typename?: 'Query';
  getAccount?: Maybe<Account>;
  searchAccounts: Array<Account>;
};


export type QueryGetAccountArgs = {
  id?: InputMaybe<Scalars['AccountId']>;
};


export type QuerySearchAccountsArgs = {
  searchQuery: SearchQuery;
};

export type SearchQuery = {
  keywords: Scalars['String'];
  orderBy: Scalars['String'];
};

export type SearchAccountsQueryVariables = Exact<{
  searchQuery: SearchQuery;
}>;


export type SearchAccountsQuery = { __typename?: 'Query', searchAccounts: Array<{ __typename?: 'Account', id: string }> };


export const SearchAccountsDocument = gql`
    query searchAccounts($searchQuery: SearchQuery!) {
  searchAccounts(searchQuery: $searchQuery) {
    id
  }
}
    `;

/**
 * __useSearchAccountsQuery__
 *
 * To run a query within a React component, call `useSearchAccountsQuery` and pass it any options that fit your needs.
 * When your component renders, `useSearchAccountsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useSearchAccountsQuery({
 *   variables: {
 *      searchQuery: // value for 'searchQuery'
 *   },
 * });
 */
export function useSearchAccountsQuery(baseOptions: Apollo.QueryHookOptions<SearchAccountsQuery, SearchAccountsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<SearchAccountsQuery, SearchAccountsQueryVariables>(SearchAccountsDocument, options);
      }
export function useSearchAccountsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<SearchAccountsQuery, SearchAccountsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<SearchAccountsQuery, SearchAccountsQueryVariables>(SearchAccountsDocument, options);
        }
export type SearchAccountsQueryHookResult = ReturnType<typeof useSearchAccountsQuery>;
export type SearchAccountsLazyQueryHookResult = ReturnType<typeof useSearchAccountsLazyQuery>;
export type SearchAccountsQueryResult = Apollo.QueryResult<SearchAccountsQuery, SearchAccountsQueryVariables>;

      export interface PossibleTypesResultData {
        possibleTypes: {
          [key: string]: string[]
        }
      }
      const result: PossibleTypesResultData = {
  "possibleTypes": {}
};
      export default result;
    