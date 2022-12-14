"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.useSearchAccountsLazyQuery = exports.useSearchAccountsQuery = exports.SearchAccountsDocument = void 0;
/*
 * This file has been generated don't modify here
 */
const client_1 = require("@apollo/client");
const Apollo = __importStar(require("@apollo/client"));
const defaultOptions = {};
exports.SearchAccountsDocument = (0, client_1.gql) `
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
function useSearchAccountsQuery(baseOptions) {
    const options = Object.assign(Object.assign({}, defaultOptions), baseOptions);
    return Apollo.useQuery(exports.SearchAccountsDocument, options);
}
exports.useSearchAccountsQuery = useSearchAccountsQuery;
function useSearchAccountsLazyQuery(baseOptions) {
    const options = Object.assign(Object.assign({}, defaultOptions), baseOptions);
    return Apollo.useLazyQuery(exports.SearchAccountsDocument, options);
}
exports.useSearchAccountsLazyQuery = useSearchAccountsLazyQuery;
const result = {
    "possibleTypes": {}
};
exports.default = result;
