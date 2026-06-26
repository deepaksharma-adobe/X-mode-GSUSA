# Campaign Highlights

A horizontally-scrolling coverflow of alternating tiles — photo tiles and
colored text panels — under a centered heading and subheading, with a centered
"KNOW MORE" CTA below. Prev/next arrows drive the track on desktop; a dynamic
dot pager drives it on mobile/tablet. No autoplay.

Figma: `5168:208597` (desktop), `5650:138158` (mobile).

## Authoring

Each block row maps to one part of the carousel:

| Row | Content | Becomes |
| --- | --- | --- |
| First text-only row | Two lines (heading, subheading) | Section heading + subheading |
| Rows with an image | Cell 1 = image, Cell 2 = panel copy | One image tile + one text panel |
| Text-only row with a link | A single link | The shared "KNOW MORE" CTA |

Text panels cycle a fixed pastel palette in author order (cream → lavender →
…), set via the `data-tone` attribute. No per-tile color authoring is required.

### Example

| Campaign Highlights |
| --- |
| A Month Of Skills, Fun & New Badges<br>From handy essentials to fun extras, explore what your council has in store. |
| ![](image-1.png) | Throughout September, the troop will engage in meaningful activities… |
| ![](image-2.png) | As they complete these experiences, the girls will work toward earning Daisy badges… |
| [KNOW MORE](/about) |

## Background

The light river-blue doodle backdrop is applied at the section level via the
**Campaign Sky** Style option (`main .section.campaign-sky` in `styles.css`).
The block's own container also carries the tint by default so it renders
correctly even without the section Style class.

## Controls

Dots and arrows come from the shared `scripts/carousel-controls.js` util; this
block owns the scroll engine (shared with `shop-by-collection`). Arrows are
desktop-only; the dot pager is mobile/tablet-only.
