import { SearchResults } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
import { SearchResultProductContext } from "../types/contexts";
declare const createContext: (searchUnitId: string, sku: string, searchResults?: SearchResults) => SearchResultProductContext | null;
export default createContext;
//# sourceMappingURL=searchResultProduct.d.ts.map