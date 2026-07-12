# Product Collection

A commerce block that renders a scrollable carousel of product cards. Products are fetched at runtime from the Adobe Commerce Catalog Service via the `storefront-product-discovery` dropin — the block outputs only configuration; product data loads client-side.

## Variants

Authors can pick either definition from the block picker:

- **Product Collection** — the standard block (bottom decorative wave on).
- **Product Collection (No Wave)** — same block with the `no-wave` class, which suppresses the decorative wave.

## Authoring

The block uses a key-value table. Supported keys:

| Key             | Description                                                        | Example                  |
| --------------- | ------------------------------------------------------------------ | ------------------------ |
| `categoryPath`  | Category URL path to pull products from                            | `new-and-featured`       |
| `maxItems`      | Maximum number of cards to render (default 4)                      | `12`                     |
| `showAddToCart` | Show the Add to Cart / Select Options button (default `true`)      | `false`                  |
| `sortBy`        | Catalog Service sort attribute (default `position`)                | `price`                  |
| `sortDirection` | Sort order — `ASC` or `DESC` (default `DESC`)                      | `ASC`                    |
| `bgColor`       | Optional section background — any CSS color (hex or name)          | `#f6f3ec` · `cornsilk`   |
| `headingAlign`  | Heading alignment — `center` centers it; unset uses the default    | `center`                 |
| `wave`          | Set to `off` (or `false`/`no`/`none`) to disable the bottom wave   | `off`                    |
| `waveCurve`     | Wave peak direction — `peak-left` or `peak-right` (default right)  | `peak-left`              |

### Heading

The heading (e.g. "New Arrivals") can be authored two ways — both render above the carousel (and inline with the tab bar in multi-tab mode):

1. **Block-level heading (preferred):** a single text-only row at the top of the block containing a heading element.
2. **Section heading (fallback):** a normal heading authored above the block in the same section. Used only when no block-level heading is present.

Set `headingAlign` to `center` to center the heading.

### Background color

Set `bgColor` to any valid CSS color to tint the full-width section behind the collection — a hex code (`#f6f3ec`) or a named color (`cornsilk`). Invalid values are ignored (the section stays transparent).

### Single category

Add one `categoryPath` row. Products from that category are shown in the carousel.

### Multi-tab (multiple categories)

Add multiple `categoryPath` rows — each becomes a tab. An optional 4th column sets the CTA link shown below the carousel when that tab is active:

| categoryPath | Tab Label | new-and-featured | /shop/new |

A 5th column may hold a fragment URL rendered as a side panel for that tab.

## Decorative wave

A bottom wave transition renders **on by default**, spanning the full-width section. Disable it per block either by choosing the **Product Collection (No Wave)** variant or by adding a `wave: off` config row. Set `waveCurve` to `peak-left` or `peak-right` to control the curve direction (defaults to `peak-right`).

Optional doodle illustrations ride on the wave when authored via `Illustration Left` / `Illustration Right` rows (with matching `... Alt` and `... Animate` rows). See the shared wave utility in `scripts/wave/`.

## Loading & empty states

- **Loading (shimmer):** before each fetch — on first load and on every tab switch — the track fills with skeleton placeholder cards (shared `.skeleton` shimmer, `aria-busy="true"`) so a slow response never leaves a blank panel.
- **Empty (multi-tab):** a tab with no products shows a `role="status"` message ("No products available in this collection right now.") instead of an empty carousel.
- **Error (multi-tab):** a failed fetch shows a retry message.
- **Empty (single category):** the block removes itself from the page (empty async block).

## Carousel behaviour

- **Mobile / tablet**: horizontal scroll snap, pagination dots shown below (2 cards per view on mobile, 4 on tablet).
- **Desktop (≥ 1280px)**: prev/next arrow buttons, dots hidden; arrows appear only when there are more than 3 cards.

## Files

- `product-collection.js` — reads config, queries products, renders the carousel, heading, wave, and loading/empty states
- `product-collection.css` — carousel layout, arrows, dots, tab bar, skeleton, and empty state
- `_product-collection.json` — block definitions (standard + No Wave) and authorable fields
