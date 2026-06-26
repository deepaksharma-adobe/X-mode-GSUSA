# Hero Block

## Overview

Full-width hero banner typically used at the top of a page. Supports background images, heading text, body copy, and CTA buttons authored via the CMS.

## Authored Structure

| Content |
|---|
| Image (background) |
| Heading, body text, links/buttons |

## Behaviour

- First `<picture>` in the block is used as the hero background image
- Remaining content (headings, paragraphs, links) is rendered as overlay text
- Links are automatically decorated as buttons by `scripts.js`

## CSS Classes

| Class | Description |
|---|---|
| `.hero` | Root block element |
| `.hero-content` | Text/CTA overlay container |

## Responsive

- Mobile: stacked layout, image above content
- Tablet (`768px`+): side-by-side or full overlay depending on styles
- Desktop (`1280px`+): full-width with max content width
