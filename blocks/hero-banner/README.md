# Hero Banner Block

## Overview

The Hero Banner renders a full-bleed promotional banner or carousel. Each slide pairs a
background image (or video) with overlaid content — eyebrow, headline, subtext, and up to
two call-to-action buttons — over a brand gradient. With more than one slide it becomes a
carousel with previous/next edge arrows, autoplay, and dot indicators.

## Authoring

Author the block as a table. Each row is one slide with two columns:

| hero-banner |||
|---|---|
| ![](slide-1.jpg) | **Eyebrow**<br>Headline<br>Subtext<br>[Shop Products](/products)<br>[Explore More](/explore) |
| ![](slide-2.jpg) | **Eyebrow**<br>Headline<br>[Shop Products](/products) |

- **Column 1** — background image (full-bleed, `object-fit: cover`). Add an `.mp4` link
  here too for a [background video](#background-video).
- **Column 2** — content. The first paragraph is the eyebrow, a heading is the headline,
  a following paragraph is subtext, and links become buttons.
- An optional **third column** holds a persistent Terms & Conditions tag shown across all
  slides.

A single-row block renders as a static hero without controls.

### Button styles

Button style is driven by the link's **formatting**, so either button can take either
style in any order:

| Authored link | Style |
|---|---|
| **Bold** link | Outlined button (`.button.secondary.light`) |
| *Italic* link | Text link with arrow (`.button.text.white`) |
| Plain link | Falls back to position — 1st = outlined, 2nd = text link |

The `secondary` and `video-banner` layouts instead render the first link as a solid-white
uppercase CTA.

## Variants & options

Compose a banner from **one layout** plus any number of stackable **modifiers**. Add them
to the block name, e.g. `Hero Banner (secondary, boxed)`.

### Layout — pick ONE

| Class | Effect |
|---|---|
| _(none)_ | Default: photo + white text + brown gradient, left-aligned, 3:4 mobile / 16:9 tablet & desktop. |
| `council` | Light cream theme, forest-green text, green outlined button, green dots. |
| `card` | Solid dark-green text card over a full-bleed photo; no gradient, no edge arrows. |
| `secondary` | Short, wide promo: left black→transparent gradient, eyebrow + headline + subtext + a solid-white uppercase CTA. 4:5 mobile / 21:9 tablet / 549px desktop. |
| `video-banner` | Short, wide promo with **center-aligned, top-anchored** content (Figma node 2734:45937). 3:4 mobile / 21:9 tablet & desktop. |

### Modifiers — stack with any layout

| Class | Effect |
|---|---|
| `boxed` | Contains the banner to the page max-width (1280px) with page margins, instead of full-bleed. |
| `align-center` | Center-aligns content horizontally (default is left). |
| `align-right` | Right-aligns content horizontally. |
| `align-vertical-center` | Centers content vertically. |
| `adaptive` | Banner height follows the **image or video's natural aspect ratio** so the media shows uncropped. |
| `no-autoplay` | Disables carousel auto-advance. |
| `no-dots` | Hides the dot indicators (edge arrows and autoplay still work). |

> `align-*` modifiers work on every layout — e.g. `Hero Banner (align-center,
> align-vertical-center)` centers content both ways. The `video-banner` layout already
> centers its content, so it needs no `align-*` class.

## Background video

To run a video behind a slide, add an `.mp4` in the **image column alongside the image**
(the image is the poster/fallback). You can paste either a **plain video URL** or a link —
both work, and the plain URL avoids any link-rewriting issues:

| hero-banner |||
|---|---|
| ![](poster.jpg)<br>https://.../clip.mp4 | **Eyebrow**<br>Headline<br>[Shop Products](/products) |

- Autoplays muted + looped, decorative (`aria-hidden`).
- A bottom-right **mute/unmute** button lets visitors turn sound on (starts muted).
- The poster image stays as the background if the browser blocks autoplay or the user
  prefers reduced motion.
- **Works with every layout.** By default the video fills the banner (`object-fit:
  cover`). Add `adaptive` to instead size the banner to the video's full aspect ratio
  (uncropped). In a carousel, `adaptive` sizes each slide to its own media — leave it off
  for a uniform carousel height.

## Common combinations

| Block name | Result |
|---|---|
| `Hero Banner` | Default left-aligned hero (single slide or carousel). |
| `Hero Banner (council)` | Council/cream theme. |
| `Hero Banner (card)` | Dark-green content card over the photo. |
| `Hero Banner (secondary)` | Left-aligned short/wide promo with solid-white CTA. |
| `Hero Banner (video-banner)` | Centered short/wide promo (Figma "Everything you need to get started"). |
| `Hero Banner (align-center)` | Default hero with centered content. |
| `Hero Banner (align-center, align-vertical-center)` | Content centered both axes. |
| `Hero Banner (boxed)` | Contained-width hero. |
| `Hero Banner (secondary, boxed)` | Contained-width secondary promo. |
| `Hero Banner (adaptive)` + video | Banner sized to the video's full ratio, uncropped. |
| `Hero Banner (video-banner)` + video | Centered promo with a 21:9 background video. |
| `Hero Banner (no-dots)` / `(no-autoplay)` | Carousel control toggles. |

**Defaults:** autoplay is **on** (6s interval) and dots are **shown**. Autoplay pauses on
hover/focus and is disabled under reduced-motion. Single-slide banners have no controls.

## Behaviour & accessibility

- **Navigate:** edge arrows or dot indicators move between slides; autoplay advances every
  6s and pauses on pointer hover or keyboard focus within the block.
- Region is labelled `aria-roledescription="Carousel"`; each slide uses `role="group"`.
- Off-screen slide links get `tabindex="-1"` so keyboard users skip them.
- Indicators expose `role="tab"` and `aria-current` for the active slide.
- The background video is `aria-hidden` and non-focusable.
