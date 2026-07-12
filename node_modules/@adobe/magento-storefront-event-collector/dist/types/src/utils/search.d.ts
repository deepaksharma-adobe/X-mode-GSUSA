import { SearchInput, SearchInputUnit, SearchResultProduct, SearchResults, SearchResultSuggestion, SearchResultUnit } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
import { SearchFilter, SearchResultCategory } from "../types/contexts";
declare const getSearchInputUnit: (searchUnitId: string, ctx: SearchInput) => SearchInputUnit | undefined;
declare const getSearchResultUnit: (searchUnitId: string, ctx: SearchResults) => SearchResultUnit | undefined;
declare const getCategory: (name: string, ctx: SearchResultUnit) => SearchResultCategory | null;
declare const getProduct: (sku: string, ctx: SearchResultUnit) => SearchResultProduct | null;
declare const getSuggestion: (suggestion: string, ctx: SearchResultUnit) => SearchResultSuggestion | null;
declare const createFilters: (ctx: SearchInputUnit) => Array<SearchFilter>;
export { createFilters, getCategory, getProduct, getSearchInputUnit, getSearchResultUnit, getSuggestion };
//# sourceMappingURL=search.d.ts.map