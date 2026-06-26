# Need Help Block

## Overview

A full-bleed khaki call-to-action bar with a heading and a "View Help & FAQs" link. On
desktop the heading sits on the left and the link on the right; on mobile both are centered
and stacked. The content is constrained to the centered grid frame while the khaki background
spans the full viewport width.

## Authoring

Author the block as a single row with two cells:

| need-help ||
|---|---|
| Need Help? We have answers to all your answers | [View Help & FAQs](/faqs) |

- **Cell 1** — the heading text.
- **Cell 2** — the call-to-action link. It is styled as a green text link with a trailing
  arrow (underlined on mobile, no underline on desktop; underlines on hover/focus).

## Behavior Patterns

### Accessibility
- The link keeps its native focus ring and underlines on hover/focus for clear affordance.
