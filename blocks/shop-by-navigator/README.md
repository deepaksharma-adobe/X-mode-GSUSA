# Shop by Navigator

A row of grade tiles for navigating to grade-level landing pages. Each tile shows a
cut-out photo standing in front of a combined decorative background (a tint shape
plus a doodle, e.g. a cloud + flower) with a label link below. The whole tile links
to the authored URL.

The background shape and doodle are **not** authored as images — they are painted by
CSS based on the tile's **decoration** value. The author only supplies the photo, the
label link, and the decoration name.

The block is mobile-first: a swipeable scroll-snap carousel with page dots on mobile
and tablet, and a static centered row on desktop (≥1280px).

## Heading

The heading (e.g. "Shop by Grade Level") can be authored two ways — both render
centered above the tiles:

1. **Block-level heading (optional):** a single text-only row at the top of the block
   containing a heading. This is exposed as the **Heading** field in the block model.
2. **Section heading (fallback):** a normal heading authored above the block in the
   same section. Used only when no block-level heading is present.

## Authoring

An optional first text-only row provides the block-level heading. Each subsequent row
is one tile, with three cells:

| Cell 1 | Cell 2 | Cell 3 |
|---|---|---|
| Photo (cut-out image) | Label wrapped in a link (`[Daisy](/daisy)`) | Decoration name (e.g. `cloud-flower`) |

- The label cell must contain a link; its text becomes the tile label and its
  `href` is where the tile navigates.
- The decoration value is applied as a CSS class on the tile and paints the combined
  background shape + doodle. The photo's alt text describes the content.

## Decoration classes (CSS-driven)

Each decoration is a generic, reusable class pairing one background shape with one
doodle. Supported values:

| Class | Background shape | Doodle |
|---|---|---|
| `cloud-flower` | cloud | flower |
| `triangle-butterfly` | triangle | butterfly |
| `circle-star` | circle | star |
| `diamond-mushroom` | diamond | mushroom |
| `square-rocket` | square | rocket |
| `badge-butterfly` | badge | butterfly |
| `blob-bird` | blob | bird |

Each class paints two layered CSS background images from `/icons`:

- Background shape: `shop-by-navigator-{shape}.svg` (e.g. `shop-by-navigator-cloud.svg`)
- Doodle: `shop-by-navigator-{doodle}.svg` (e.g. `shop-by-navigator-flower.svg`)

Shapes and doodles are independent assets, so a doodle (e.g. butterfly) can be reused
across decorations. To add a new decoration, add a `.{shape}-{doodle} .shop-by-navigator-media`
rule in `shop-by-navigator.css` and commit the matching shape + doodle assets to `/icons`.

## Notes

- All colours, spacing, radii and typography come from design tokens in
  `styles/styles.css`. No hardcoded values.
- Labels are plain black on desktop and green underlined links on tablet/mobile,
  matching Figma. Hover scales the photo.
- The cut-out photo stands full and uncropped in front of the CSS-painted
  background + doodle decoration.
