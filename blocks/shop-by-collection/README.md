# Shop By Collection Block

## Overview

A horizontally-scrolling carousel of collection cards (Figma node 5168:208534)
under a centered "Shop By Collection" heading. Each card has a tall 4:5 image, a
"Girl Scout" serif title, and a forest-green **Collection →** text link. Circular
prev/next arrows and dot indicators control the scroll. No autoplay.

Shows **1 card on mobile, 2 on tablet (≥768px), 4 on desktop (≥1280px)**.

## Heading

The "Shop By Collection" heading can be authored two ways — both render centered
above the carousel:

1. **Block-level heading (optional):** a single text-only row at the top of the
   block containing a heading. This is exposed as the **Heading** field in the
   block model.
2. **Section heading (fallback):** a normal `H2` authored above the block in the
   same section (the way `category-grid` does it). Used only when no block-level
   heading is present.

## Authoring

Each block row is **one card**: cell 1 = image, cell 2 = content (a heading + a
link). An optional first text-only row provides the block-level heading.

| shop-by-collection |                                       |
|--------------------|---------------------------------------|
| ![](cookie.jpg)    | ### Cookie Gear  [Collection](/cookie)|
| ![](stem.jpg)      | ### STEM  [Collection](/stem)         |
| ![](outdoor.jpg)   | ### Outdoor  [Collection](/outdoor)   |
| ![](art.jpg)       | ### Art  [Collection](/art)           |

- The card title comes from the heading in cell 2; the CTA from the link
  (its text + href). The link is styled as a `.button.text-secondary` text link.
- Rows without an image or link are ignored.

## Behaviour & accessibility

- The block is a `role="region"` with `aria-roledescription="carousel"`; each card
  is a `role="group"` / slide.
- **Arrows** scroll the track by one card (smooth); they disable at the start/end.
- **Dots** map to card positions, set `aria-current` on the active card, and scroll
  to that card on click. An `IntersectionObserver` keeps the active dot and the
  arrow disabled-states in sync while scrolling.
- The track uses CSS scroll-snap; arrows are hidden on mobile (single-card view).
