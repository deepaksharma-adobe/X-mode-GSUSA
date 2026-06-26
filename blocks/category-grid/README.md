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

Place a "Shop by Category" heading as default content above the block.

## Behavior Patterns

### Accessibility
- Banner card title uses a real heading; the Collection link keeps its native focus ring.
