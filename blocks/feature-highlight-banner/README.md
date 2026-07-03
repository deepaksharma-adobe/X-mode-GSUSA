# Feature Highlight Banner Block

## Overview

A bright Girl Scouts green call-to-action banner for the Council Home Page that invites users
to get started with Quick Order. It shows a centered heading, supporting subtext, and a solid
green CTA button, with a decorative daisy in the top-left corner and a lightbulb in the
bottom-right corner.

The decorative icons are code-provided (not authored) and marked `aria-hidden`. The banner
stacks and scales responsively across desktop, tablet, and mobile without overflow.

## Authoring

Author as a single row with one content cell:

| feature-highlight-banner ||
|---|
| ## Save Time with Quick Order<br>Have your SKUs? Add them here to quickly build your council's order — fast and simple.<br>[Start Quick Order](/quick-order) |

- A heading becomes the banner headline.
- A plain paragraph becomes the subtext.
- A paragraph containing a link becomes the CTA button (label and link are authored).

All fields are optional. Omitting the heading, subtext, or CTA renders the block cleanly
without that part.

## Behavior Patterns

### CTA
- Clicking the CTA navigates to the authored link (e.g. the Quick Order page).
- The button uses the shared `.button.primary` styling: forest-green fill, white uppercase
  label, darker green on hover/focus with a visible focus ring.

### Accessibility
- Decorative daisy and lightbulb are `aria-hidden="true"`.
- CTA is a real link with keyboard focus state and a tap target of at least 44×44px.

### Responsive
- Mobile: default (no media query).
- Tablet: `min-width: 768px`.
- Desktop: `min-width: 1280px` (Figma frame 1280×276).
