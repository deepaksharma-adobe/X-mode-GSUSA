# Category Grid Block

## Overview

A "Shop by Category" mosaic of category cards. Two card styles, mixed in one grid:

- **Banner card** — a 4:5 image with an overlaid title, short body, and a "Collection" link.
- **Label card** — an image with a colored label bar below it bearing the category name.

The mosaic reflows responsively: a 12-column grid on tablet/desktop, single column on mobile.

## Authoring

Author as a table; each row is one card with up to three cells:

| category-grid ||||
|---|---|---|
| ![](uniforms.jpg) | ## Uniforms<br>Short body copy.<br>[Collection](/uniforms) | |
| ![](badges.jpg) | Badges & Awards | yellow tile |
| ![](toys.jpg) | Toys & Outdoor | mint wide |
| ![](gifts.jpg) | Gifts | gold third |

- **Cell 1** — the card image.
- **Cell 2** — content. A heading + link makes a **banner card**; plain text makes a **label card**.
- **Cell 3 (optional)** — space-separated options:
  - **Color** (label cards): `yellow`, `pink`, `cyan`, `purple`, `mint`, `peach`, `orange`, `gold`, `sky`
  - **Size**: `tile` (1:1 quarter, default), `wide` (4:1 half), `third` (21:9 third)

### Heading

The "Shop by Category" heading can be authored two ways — both render centered above the grid:

1. **Block-level heading (optional):** a single text-only row at the top of the block containing a heading. This is exposed as the **Heading** field in the block model.
2. **Section heading (fallback):** a normal heading authored above the block in the same section. Used only when no block-level heading is present.

## Behavior Patterns

### Accessibility
- Banner and label cards with a link use a single `<a class="category-grid-link">` wrapping the full card.
- Banner card title uses a real heading; the Collection CTA is a `<span>` (no nested links).
- Label cards shift to forest green (`--color-gs-forest`) with underline on hover.
- Image zoom on hover is disabled when `prefers-reduced-motion` is set.
