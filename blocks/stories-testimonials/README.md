# Stories & Testimonials Block

## Overview

A coverflow image carousel of customer stories (Figma node 2751:46705) under a
centered "Customer Stories" serif heading. Each slide pairs an image with a
two-line quote and a bordered **KNOW MORE** CTA. On desktop the active image is
large and centered while the previous/next images peek on the sides, dimmed; on
tablet/mobile a single image shows with a dot pager.

## Authoring

Author as a table. **The first row (text only, no image) is the heading.** Each
subsequent row is one slide: cell 1 = image, cell 2 = quote (two paragraphs)
including a `KNOW MORE` link.

| stories-testimonials |                                                        |
|----------------------|--------------------------------------------------------|
| Customer Stories     |                                                        |
| ![](story1.jpg)      | **Girl Scouts have been…** Join us! [KNOW MORE](/about)|
| ![](story2.jpg)      | **…quote line 1** quote line 2 [KNOW MORE](/x)         |

- First paragraph renders medium-weight, second regular (Figma).
- The link becomes the `.button.secondary` KNOW MORE CTA.
- Supply **3+ slides** for the desktop coverflow peek effect (degrades gracefully).

## Background

The blue backdrop is **section-level**, not in the block. In Universal Editor,
set the section **Style → Stories Blue** (or add `stories-blue` to the section
classes). This applies `--color-gs-marine` at 15% via `main .section.stories-blue`.

## Behavior & accessibility

- `role="region"` + `aria-roledescription="carousel"`; each slide is a
  `role="group"` slide with `aria-hidden` on inactive slides.
- **Desktop:** prev/next arrows (chevron SVG). **Tablet/mobile:** dynamic
  forest-green dot pager. Arrows disable at the ends; `aria-current` marks the
  active dot. Clicking a peeking side image advances to it.
- CTA label is wrapped so any underline applies to text only, never an icon.
