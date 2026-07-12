# Hero Block

## Overview

Full-bleed promotional hero for product list pages (PLP). A background image spans the
viewport width with an optional left-aligned text overlay (Figma node 2967:68941).
Any legibility gradient is baked into the authored image — not applied in CSS.

## Authoring

| hero |
|---|
| ![](background.jpg) |
| # Heading |
| Body copy paragraph. |
| [Shop now](/shop) |

- **Image** — first `<picture>` in the block.
- **Text** — heading, body, and optional link (styled by global `decorateButtons`).

Decoration produces two wrappers: `.hero-image` and `.hero-text`.

### DA / Universal Editor

Defined in `blocks/hero/_hero.json`. Run `npm run build:json` after changes.

## Responsive layout

| Breakpoint | Aspect ratio |
|---|---|
| Mobile (default) | 3:2 |
| Tablet (768px+) | 3:2 |
| Desktop (1280px+) | 4:1 |

Place the hero in a section with `data-margin="hero"` for zero vertical margin.
