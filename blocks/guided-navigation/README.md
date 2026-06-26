# Guided Navigation Block

## Overview

A compact "I am looking for …" bar (Figma nodes 5168:208529, 2994:99493): a label,
a dropdown of author-defined destinations, and a **GO** button that navigates to
the selected option. Rendered on a green brand bar.

## Authoring

Author the block as a table. Each row that holds **one link** becomes a dropdown
option (link text = label, link URL = destination). Two optional **config rows**
let you override the static strings — a two-cell row whose first cell is `Label`
or `Button`:

| guided-navigation ||
|---|---|
| Label | I am looking for |
| Button | Go |
| [Uniforms](/uniforms) ||
| [Daisy Uniform Patches](/patches) ||
| [Badges & Awards](/badges) ||

- Each link becomes one option in the dropdown, in source order.
- The first link is selected by default.
- `Label` / `Button` rows are optional; they default to "I am looking for" and
  "Go". The label also becomes the dropdown's accessible name.
- Clicking the **GO** button navigates to the selected option's URL.

## Responsive behaviour

The green bar is **fluid / full-bleed** — it spans the full viewport width (like the
footer) while its inner content stays within the page grid margins.

- **Mobile** (< 768px): the label sits on its own row; the dropdown (which flexes to
  fill the width) and the GO button sit together on the row below. (Figma 5650:138090)
- **Tablet & desktop** (≥ 768px): label, dropdown (fixed 238px), and GO on a single
  centered row. (Figma 5168:208529)

## Behavior & accessibility

- The dropdown is a custom **ARIA combobox** (Figma 2994:99493): a `button`
  trigger (`aria-haspopup="listbox"`) opens a panel containing a `role="listbox"`
  of the authored options.
- Keyboard: **↑/↓** open the panel / move the highlight, **Enter** (or Space)
  selects, **Esc** closes. The active option is tracked via
  `aria-activedescendant`; selection via `aria-selected`.
- Closes on outside click or Esc. The GO button is a real `<button>`; navigation
  uses `window.location.assign` to the selected option's URL.
