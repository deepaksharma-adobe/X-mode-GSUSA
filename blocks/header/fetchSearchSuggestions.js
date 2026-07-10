import { CS_FETCH_GRAPHQL } from '../../scripts/commerce.js';

/**
 * Lightweight, header-only companion to @dropins/storefront-product-discovery's
 * search() query — requests `items`, `total_count`, and `suggestions` via its
 * own inline product selection (no ProductView/Facet fragments, no
 * attributeMetadata) so it stays isolated from the shared dropin query used
 * by search() and the /search results page.
 */
const SEARCH_SUGGESTIONS_QUERY = `
  query SearchSuggestions(
    $phrase: String!
    $pageSize: Int
    $filter: [SearchClauseInput!]
  ) {
    productSearch(
      phrase: $phrase
      page_size: $pageSize
      filter: $filter
    ) {
      items {
        productView {
          name
          sku
          urlKey
          ... on ComplexProductView {
            id
            name
            images(roles: "small_image") {
              url
              roles
              label
            }
            priceRange {
              minimum {
                final {
                  amount {
                    value
                    currency
                  }
                }
              }
            }
          }
          ... on SimpleProductView {
            id
            name
            images(roles: "small_image") {
              roles
              url
              label
            }
            sku
            urlKey
            price {
              final {
                amount {
                  currency
                  value
                }
              }
            }
          }
        }
      }
      total_count
      suggestions
    }
  }
`;

/**
 * @typedef {Object} SearchSuggestionsResult
 * @property {number} totalCount
 * @property {string[]} suggestions
 * @property {object[]} items Raw `productView` entries (see query above)
 */

/**
 * Fetches Live Search query suggestions (and lightweight item previews) for
 * the header type-ahead.
 * @param {{ phrase: string, pageSize?: number, filter?: object[] }} params
 * @returns {Promise<SearchSuggestionsResult>}
 */
export async function fetchSearchSuggestions({ phrase, pageSize, filter }) {
  const { data, errors } = await CS_FETCH_GRAPHQL.fetchGraphQl(SEARCH_SUGGESTIONS_QUERY, {
    variables: { phrase, pageSize, filter },
  });

  if (errors?.length) {
    throw new Error(errors.map((error) => error.message).join('; '));
  }

  return {
    totalCount: data?.productSearch?.total_count || 0,
    suggestions: data?.productSearch?.suggestions || [],
    items: (data?.productSearch?.items || []).map((item) => item?.productView).filter(Boolean),
  };
}
