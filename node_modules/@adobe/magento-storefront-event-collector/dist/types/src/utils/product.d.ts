import { Product, ShoppingCartItem } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
import { ProductContext, ProductPricing } from "../types/contexts";
declare const createPricing: (ctx: Product) => ProductPricing | undefined;
declare const createProductFromCartItem: (ctx: ShoppingCartItem) => ProductContext;
export { createPricing, createProductFromCartItem };
//# sourceMappingURL=product.d.ts.map