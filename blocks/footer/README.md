# Footer Block

## Overview

Loads and renders the site footer from a fragment, rebuilding the authored
content into a responsive, branded layout that matches the Girl Scouts design:

- **Mobile / tablet (<1100px)** — link groups become collapsible accordions
- **Desktop (1100px+)** — link groups display as always-open columns with a
  promo card and wholesale message in a right-hand rail, and a legal bar across
  the bottom
- **1100–1279px (narrow desktop)** — `--grid-2-margins` horizontal padding
- **1280px+** — `--grid-3-margins` horizontal padding

The brand logo is read from the first brand section in the footer fragment.
When none is authored, the block falls back to `/icons/gs-logo-white.svg`.

## Authored Structure

Footer content is authored on a separate `/footer` page (or the path set in page
metadata `footer`). Each part of the footer is a **section**. Set **Section
Metadata → Style** to the values below so classification is explicit; when Style
is omitted, the block falls back to content heuristics (headings, lists,
pictures, etc.).

### Brand logo — Style: `footer-brand`

Add a section containing only the logo — no heading or list.

```
(Section Metadata: Style = footer-brand)
```

**Option A — icon notation** (same pattern as social icons):

```
:gs-logo-white:
```

**Option B — uploaded image** (SVG or PNG):

```
![Girl Scouts](./gs-logo-white.svg)
```

Authors may wrap the logo in a home link:

```
[![Girl Scouts](/)](https://www.girlscoutshop.com/)
```

### Navigation columns — Style: `footer-nav`

Add one or more sections with Style `footer-nav`. Each heading + list inside
becomes a column (an accordion on mobile/tablet). The first three columns form
the top row on desktop; any further columns wrap to a second row.

```
(Section Metadata: Style = footer-nav)

Quick Links
- [My Account](/account)
- [Quick Order](/quick-order)
- [Store Locator](/stores)

Help Center
- [Contact us](/contact)
- [FAQ](/faq)
```

A column whose links point at social networks (Facebook, Instagram, YouTube,
LinkedIn, WhatsApp, X / Twitter) is detected automatically: the link text is
replaced with the matching icon from `/icons/`.

```
Follow Us On
- [Facebook](https://facebook.com/girlscouts)
- [X](https://x.com/girlscouts)
- [Instagram](https://instagram.com/girlscouts)
```

### Promo card — Style: `footer-promo`

```
(Section Metadata: Style = footer-promo)

![Promo image](./media_promo.jpg)

#### Be the first to know what's new!

Sign up for emails and get insider updates, special offers, and gear that
celebrates every Girl Scout

[Subscribe Now](/subscribe)
```

### Wholesale message — Style: `footer-wholesale`

```
(Section Metadata: Style = footer-wholesale)

Hello, Wholesale Partners

[Login Here](/wholesale-login)

for your personalized Experience
```

### Legal bar — Style: `footer-legal`

The list becomes the legal links; the remaining paragraph is the copyright line.

```
(Section Metadata: Style = footer-legal)

- [Privacy Policy](/privacy-policy)
- [Terms & Conditions of Use](/terms)
- [Product Safety Statement](/product-safety)

© 2025 Girl Scouts of the USA
```

## Configuration

| Metadata key | Description |
|---|---|
| `footer` | Custom path to the footer fragment (defaults to `/footer`) |

## Behaviour

- Loads footer content from the fragment path
- Classifies sections by Section Metadata Style (`footer-brand`, `footer-nav`,
  etc.) with content-heuristic fallback
- Uses the authored brand logo (picture or `:gs-logo-*:` icon); falls back to
  `/icons/gs-logo-white.svg`
- Home link href uses `rootLink()` for locale-aware paths
- Builds accordion columns; the first column starts expanded, others collapsed
- Swaps social link text for SVG icons by matching the link hostname
- Accordions are interactive below 1100px and always-open at 1100px+

## Dependencies

- `fragment` block — `loadFragment()`
- `scripts/aem.js` — `getMetadata()`

## Design Tokens

| Purpose | Token |
|---|---|
| Background | `--color-gs-dark-green` |
| Promo card background | `--color-gs-forest` |
| Dividers / accordion rules | `--color-gs-footer-border` |
| Text | `--color-neutral-50` |
| Horizontal padding | `--grid-1-margins` (mobile) → `--grid-2-margins` (1100–1279) → `--grid-3-margins` (1280+) |