# Mission Banner Block

## Overview

A khaki call-to-action card with a headline, supporting copy, and a "Know More" link. It has
two looks, switchable per-instance in the same document:

- **Default (plain)** — headline + body + green CTA button.
- **Art** — adds a decorative wooden "Girl Scouts" signpost illustration and a corner flower
  that breaks outside the card edge.

On desktop the content sits left with a solid green button on the right; on tablet and mobile
the card stacks and centers, and the CTA becomes an underlined green text link.

## Authoring

Author as a single row, one content cell:

| mission-banner ||
|---|
| ## When you support Girl Scouts, you empower leaders.<br>Councils and partners play a key role…<br>[Know More About Girl Scouts](/about) |

- A heading becomes the headline, the paragraph becomes the body, and the link becomes the CTA.

### Variant — art effect

Add the variant to the block name to enable the signpost + flower art:

`Mission Banner (art)`

The art is decorative (`aria-hidden`) and added automatically; it is not authored content.

## Behavior Patterns

### Accessibility
- Decorative signpost and flower are `aria-hidden="true"`.
