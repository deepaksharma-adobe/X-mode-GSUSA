import { SearchResults } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
import { SearchResultSuggestionContext } from "../types/contexts";
declare const createContext: (searchUnitId: string, suggestion: string, searchResults?: SearchResults) => SearchResultSuggestionContext | null;
export default createContext;
//# sourceMappingURL=searchResultSuggestion.d.ts.map