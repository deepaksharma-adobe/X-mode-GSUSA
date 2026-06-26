# Values Block

## Overview

A full-bleed light-green panel showing a row of value props — each a circular icon badge
with a bold title and a short subtext. A decorative wave-and-trees header transitions the
white area above into the green panel. Cards are constrained to the centered grid frame:
4 across on desktop, 2 on tablet, 1 on mobile.

## Authoring

Author the block as a table with one row per card, two cells each:

| values ||
|---|---|
| ![](icon.svg) | **Products Modelled by Girl Scouts**<br>Subtext placeholder |
| ![](icon.svg) | **Made In The USA**<br>Subtext placeholder |

- **Cell 1** — the icon (a circular badge image, ~60px).
- **Cell 2** — the title (first paragraph, bold) and an optional subtext paragraph.

The wave + trees header is decorative and added automatically.

## Behavior Patterns

### Accessibility
- The decorative header is marked `aria-hidden="true"`.
