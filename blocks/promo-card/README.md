# Promo Card

A pale-peach promotional card with a large serif heading, a green text CTA with a
trailing chevron, and a product photo that bleeds into the card. Three layouts:
**horizontal** (default, wide banner), **compact** (square card), and **vertical**
(portrait card) — same content model, only the layout class differs.

## Authoring

One row, three cells:

| promo-card ||||
|---|---|---|
| ![](product.jpg) | # New Arrivals | [Shop All Collection](/new-and-featured) |

- **Cell 1** — the product image.
- **Cell 2** — the heading (e.g. "New Arrivals").
- **Cell 3** — the CTA link (e.g. "Shop All Collection"); a `›` chevron is added automatically.

## Variations

Pick the variation when placing the block (each is a separate palette entry / block
name); the content is authored identically for all three.

- **Promo Card** — default horizontal layout (wide banner): heading + CTA top-left,
  photo bleeds into the bottom-right.
- **Promo Card (Compact)** — `compact` class: square card, heading + CTA on top, photo
  filling the space below.
- **Promo Card (Vertical)** — `vertical` class: taller portrait card, same stacked
  layout as compact but with more height for the photo.

## Behavior Patterns

### Accessibility
- Author meaningful alt text for the product image.
- The CTA chevron is decorative (CSS `::after`), so it is not read by screen readers.
