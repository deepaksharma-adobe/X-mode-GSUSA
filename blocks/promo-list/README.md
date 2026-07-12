# Promo List

A vertical list of items, each with an icon and a block of text, rendered on a
pale-blue section panel. A "Know More About Girl Scouts" call-to-action button follows
the list.

## Authoring

Each block row is one list item with **two fields**:

| icon          | text                                                            |
| ------------- | --------------------------------------------------------------- |
| Icon          | Girl Scout Daisies are the youngest members …                   |

- **icon** — an icon for the item. In a document, authored as `:icon-name:` (the matching
  SVG must exist in `/icons/<icon-name>.svg`; bundled icons are `daisy-face`,
  `lightbulb-box`, and `book-bulb`). In the Universal Editor, chosen via the Icon field.
- **text** — the item copy, rendered as a single styled text block.


## Responsive

Mobile-first. Breakpoints at 768px (tablet) and 1280px (desktop) adjust horizontal
padding to match the design.
