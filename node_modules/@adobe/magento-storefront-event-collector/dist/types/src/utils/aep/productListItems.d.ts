import { StorefrontInstance, ShoppingCartItem, RequisitionListItems } from "@adobe/magento-storefront-events-sdk/dist/types/types/schemas";
import { ProductListItem } from "../../types/aep";
/**
 * create a list of shopping cart items from the `ShoppingCart` context for AEP
 *
 * @remarks `discountAmount` and `selectedOtions` are not supported in the sdk type yet
 */
declare const createProductListItems: (productListItemsFromCustomContext: ProductListItem[] | undefined, cartContext: {
    items?: Array<ShoppingCartItem>;
} | undefined, requisitionListItemsContext: RequisitionListItems | undefined, storefrontContext: StorefrontInstance) => ProductListItem[];
export { createProductListItems };
//# sourceMappingURL=productListItems.d.ts.map