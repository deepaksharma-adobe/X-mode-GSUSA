# Values Block

## Overview

A full-bleed light-green panel showing a row of value props — each a circular icon badge
with a bold title and a short subtext. Two background treatments share the same card grid:

- **Wave** (default) — decorative wave-and-trees header transitions the white area above
  into the green panel.
- **Flat** — solid green panel with no wave or illustrations.

Cards are constrained to the centered grid frame: 4 across on desktop, 2 on tablet,
2 on mobile.

## Variations

Pick the variation when placing the block (separate palette entries); card content is
authored identically for both.

- **Values** — wave header with optional left/right illustrations (defaults to trees on
  the right).
- **Values (Flat)** — `flat` class: no wave, no illustrations, flat green background only.

## Authoring

Author the block as a table with one row per card, two cells each. Optionally add
illustration rows (any position) to set the wave figures — one on the left and/or one on the
right; omit them to use the default trees.

| values ||
|---|---|
| Illustration Left | ![](bird.svg) |
| Illustration Left Alt | Blue bird |
| Illustration Right | ![](trees.svg) |
| Illustration Right Alt | Girl Scouts trees |
| Illustration Right Animate | on |
| Wave curve | peak-right |
| ![](icon.svg) | **Products Modelled by Girl Scouts**<br>Subtext placeholder |
| ![](icon.svg) | **Made In The USA**<br>Subtext placeholder |

- **`Illustration Left`** / **`Illustration Right`** *(both optional)* — image pinned to that
  side of the wave. `Illustration` (no side) is treated as right. Defaults to the trees on the
  right when none are set.
- **`Illustration Left Alt`** / **`Illustration Right Alt`** *(optional)* — alt text; leave empty
  if decorative.
- **`Illustration Left Animate`** / **`Illustration Right Animate`** *(optional)* — a gentle
  fade-in on scroll is applied automatically. Set this to `on` to *also* give that illustration a
  continuous float loop. Defaults to **off**. (All motion is suppressed for visitors with
  `prefers-reduced-motion`.)
- **`Wave curve`** *(optional)* — direction the wave peaks: `peak-left` or `peak-right`.
  Defaults to **peak-right**. (Applies to the default **Values** variation only; **Flat** has no wave.)
- **Card rows** — Cell 1 = the icon (circular badge image or `icon-*` span, ~60px); Cell 2 = the title
  (first paragraph, bold) + optional subtext paragraph.
- **Heading row** *(optional)* — a row with a heading (`h1`–`h6`) and no icon renders as
  `.values-heading` above the card grid (e.g. `## In-Store Services from Local Councils`).

Illustration rows can go **anywhere** in the table; they're detected by the label in the first
cell, so they're never mistaken for a card, and nothing breaks if they're absent. The green
wave header is added automatically on the default **Values** variation only (not on **Flat**).

## Behavior Patterns

### Accessibility
- The decorative header is marked `aria-hidden="true"`.
