import { Recommendations, RecommendationUnit, RecommendedProduct } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
declare const getUnit: (unitId: string, ctx: Recommendations) => RecommendationUnit | null;
declare const getProduct: (unitId: string, productId: number, ctx: Recommendations) => RecommendedProduct | null;
export { getProduct, getUnit };
//# sourceMappingURL=recommendations.d.ts.map