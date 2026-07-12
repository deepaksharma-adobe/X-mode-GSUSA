import { Recommendations } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
import { RecommendedItemContext } from "../types/contexts";
declare const createContext: (unitId: string, productId: number, recommendations?: Recommendations) => RecommendedItemContext | null;
export default createContext;
//# sourceMappingURL=recommendedItem.d.ts.map