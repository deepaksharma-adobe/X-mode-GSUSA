# Commerce Product Card

Reusable merchandising product card (Figma `5168:202087`) with image hover, gallery carousel, wishlist, and add-to-cart (including a configurable-product drawer). Same design is used on PLP and any future consumer that calls `renderProductCard()`.

## Public API

### Single card

```javascript
import { renderProductCard } from '../../scripts/components/commerce-product-card/commerce-product-card.js';

await renderProductCard(host, { product: productView });
```

### Many cards (PLP, slider, recommendations)

Use `prepareProductCardContext()` once, then render each product in a loop or via `renderProductCards()`:

```javascript
import {
  prepareProductCardContext,
  renderProductCard,
  renderProductCards,
} from '../../scripts/components/commerce-product-card/commerce-product-card.js';

// Option A — batch helper (grid/list)
await renderProductCards(grid, {
  products: items.map((item) => item.productView),
  asList: true,
  options: { useDummyData: false },
});

// Option B — manual iteration with shared context (pagination, virtual lists)
const context = await prepareProductCardContext({ useDummyData: false });

products.forEach(async (productView) => {
  const host = document.createElement('div');
  host.className = 'commerce-product-card-list__item';
  grid.append(host);
  await renderProductCard(host, { product: productView, context });
});
```

`prepareProductCardContext()` loads CSS and placeholders **once**; pass `context` into every `renderProductCard()` call so PLP pages with 12–48 cards do not repeat that work.

### PLP note

The product-list-page dropin (`SearchResults`) only exposes partial slots (image, name, price, actions). For the full GS card on PLP you can either:

1. Build a custom grid from `search/result` items and call `renderProductCards()`, or
2. Wire slots incrementally (partial GS card inside dropin chrome).

Each card is independent: wishlist, add-to-cart, and the configurable drawer work per item. Only one drawer opens at a time.

## Behavior

| Product type | Add to cart |
|--------------|-------------|
| Simple | Adds SKU directly via cart drop-in |
| Configurable (`ComplexProductView`) | Opens right-side drawer for option selection |
| Out of stock | Button disabled |

Additional UX:

- Primary image with optional hover-image crossfade
- Image carousel when multiple gallery images exist
- Wishlist toggle via wishlist drop-in
- NEW badge from `featured_items` / news dates
- Sale price row when `final < regular`
- Color swatches (display-only on card)
- Rating row when `rating_summary` / `review_count` attributes exist
- Optional SKU line and wholesale price label (see `options` below)

### Card display options

Pass via `renderProductCard(host, { product, options })`:

| Option | Default | Description |
|--------|---------|-------------|
| `showSku` | `false` | Show `SKU: {sku}` under the title (Figma `5168:280328`) |
| `showWholesalePriceLabel` | `false` | Show wholesale price label above the price row |

Label copy comes from placeholders:

```javascript
placeholders.ProductCard.SkuLabel           // default: "SKU:"
placeholders.ProductCard.WholesalePriceLabel // default: "Wholesale Price:"
```

Example (wholesale / B2B card):

```javascript
await renderProductCard(host, {
  product: productView,
  options: {
    showSku: true,
    showWholesalePriceLabel: true,
    placeholders: labels,
  },
});
```

## Product data shape

Expects a Catalog Service `productView` (same as PLP / recommendations):

- `sku`, `name`, `urlKey`, `inStock`
- `__typename` or `typename` (`SimpleProductView` / `ComplexProductView`)
- `images[]` — hover uses `label: "hover"` only; all other images feed the carousel (deduped by URL)
- `price` (simple) or `priceRange.minimum` (complex)
- `options[]` with swatch values for configurable products
- `attributes[]` for display name, badges, ratings

## Files

| File | Role |
|------|------|
| `normalize-product.js` | Maps productView → card model |
| `product-card-media.js` | Images, hover swap, carousel |
| `product-card-drawer.js` | Configurable quick-add drawer |
| `commerce-product-card.js` | `renderProductCard()` entry point |
| `*.css` | Scoped styles |

## Assumptions

- Hover image: `label === "hover"` (case-insensitive); never included in the carousel
- Configurable drawer uses PDP drop-ins with scope `product-card-drawer`
- Cart count updates via existing `cart/updated` event bus (mini-cart listens automatically)
- **Rating:** from `rating_summary` / `review_count`; placeholder `4.6 (120)` per Figma until API attributes are populated (replaced automatically when present)
- **Badges:** from `featured_items` (`New`, `Best Seller`); dummy NEW + Best Seller when missing (`useDummyData: true`, default)
- **Sale offer:** only when `final < regular` from API price — not from `featured_items: "Sale"`

Disable placeholders when real CMS data is wired:

```javascript
await renderProductCard(host, {
  product: productView,
  options: { useDummyData: false },
});
```

## Example consumer

```javascript
import { renderProductCard } from '../../scripts/components/commerce-product-card/commerce-product-card.js';

products.forEach(async (productView) => {
  const slot = document.createElement('div');
  track.append(slot);
  await renderProductCard(slot, { product: productView });
});
```
