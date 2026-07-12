# Wave Header

A reusable, authorable decorative wave band with an optional illustration. Drop it above or
below any content section. The wave colour and shape are themeable, and the position (top or
bottom) flips the curve.

## How to author

1. In your document, create a **table**.
2. Put **`Wave Header`** in the first (single-cell) row — this names the block.
3. Add one row per option below, each as **two columns**: the **label** in the left cell, the
   **value** in the right cell. Use the labels exactly as shown (they are slugified to match
   the code). Every option row is optional — omit a row to use its default.
4. Set the look:
   - **`Position`** — `top` or `bottom` (bottom flips the curve).
   - **`Shape`** — `standard` (taller curve) or `shallow` (shorter curve).
   - **`Curve`** — `peak-left` or `peak-right` (mirrored).
   - **`Color`** — any CSS colour (e.g. `#00AE43`, `red`). Add an **`Opacity`** row (e.g. `6%`)
     to tint it.
5. Add illustrations (optional):
   - Insert an **image** in the right cell of **`Illustration left`** and/or
     **`Illustration right`** — one figure pins to each side.
   - Add **`Left alt`** / **`Right alt`** text; leave empty if the image is purely decorative.
   - Illustrations fade in automatically when scrolled into view. To *also* give one a continuous
     float loop, add a **`Left animate`** / **`Right animate`** row set to `on` (default is `off`).
     All motion is suppressed for visitors with `prefers-reduced-motion`.
6. Preview, then Publish.

### Table layout

| Wave Header |  |
| --- | --- |
| Position | `top` |
| Curve | `peak-right` |
| Color | `#00AE43` |
| Opacity | `6%` |
| Illustration left | *(image)* |
| Left alt | Blue bird |
| Left animate | `on` |
| Illustration right | *(image)* |
| Right alt | Butterfly |

> The first row (`Wave Header`) spans the whole table. Every other row is `label | value`.
> All option rows are optional — omit a row to use its default.

### Options

| Label (left cell) | Purpose | Allowed values (right cell) | Default |
| --- | --- | --- | --- |
| `Position` | Which edge the curve sits on | `top`, `bottom` | `top` |
| `Shape` | Which wave curve | `standard` (121px), `shallow` (95px) | `standard` |
| `Curve` | Which side the wave peaks (mirrored) | `peak-left`, `peak-right` | `peak-left` |
| `Color` | Wave fill — **any CSS colour** | `#00AE43`, `red`, `rgb(...)`, … | subtle marine |
| `Opacity` | Optional opacity applied to `Color` | `6%`, `6`, `0.06` | none |
| `Illustration left` | Optional illustration pinned left | an image | — |
| `Left alt` | Alt text for the left illustration | text (empty = decorative) | empty |
| `Left animate` | Continuous float loop (fade-in is automatic) | `on`, `off` | `off` |
| `Illustration right` | Optional illustration pinned right | an image | — |
| `Right alt` | Alt text for the right illustration | text (empty = decorative) | empty |
| `Right animate` | Continuous float loop (fade-in is automatic) | `on`, `off` | `off` |

Set neither illustration → only the wave renders. Set both → one on each side (e.g. bird
left + butterfly right). `Color` accepts any CSS colour; add `Opacity` to tint it (rendered
as `color-mix(in srgb, <color> <opacity>, transparent)`).

### Example — bottom wave, custom red, tree on the left only

| Wave Header |  |
| --- | --- |
| Position | `bottom` |
| Curve | `peak-left` |
| Color | `red` |
| Illustration left | *(image)* |
| Left alt | *(empty — decorative)* |

## Behaviour

- The wave is drawn with a CSS `mask` + `background-color` token, so it recolours cleanly.
- `Position = bottom` flips the curve vertically and anchors it to the top edge.
- The wave is full-bleed; the icon aligns to the centered grid frame (`--grid-*-margins`).

## Extending

- **Curve** uses one SVG (`/icons/wave-left.svg`) mirrored via CSS — `peak-left`/`peak-right`
  (horizontal flip) and `top`/`bottom` (vertical flip). No extra SVGs needed for those.
- **A genuinely different wave shape:** swap/add the `mask-image` on `.wave-header__wave`
  (and, if you want it selectable, add a class + option).
- **Colours** are author-driven (the `Color` / `Opacity` rows) — no code change needed.

After editing `_wave-header.json`, run `npm run build:json` to regenerate the component
definition/model/filter files.
