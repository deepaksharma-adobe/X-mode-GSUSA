# Info Feature Callout

A 50-50 teaser pairing a content column (decorative icon, heading, hairline
divider, body, CTA) with a media column. Two layouts share one block.

Figma: `2734:46116` (default), `5168:284082` (image-left), `5168:268732` (mobile).

## Variants

| Variant | Class | Layout |
| --- | --- | --- |
| Default | _(none)_ | Content left, a single image right (~4:3; the multi-photo collage is one authored/exported image). Stacks content-over-image on tablet/mobile. CTA is a forest-green text link with a chevron. Icon: flower. |
| Image Left | `image-left` | A single 516×516 image left, content right. CTA is a bordered forest-green button. Icon: light-bulb. Designed to sit on the "Teaser Doodle" section backdrop. |

## Authoring

| Row | Content | Becomes |
| --- | --- | --- |
| 1st text-only row | richtext: heading, body paragraph, CTA link | The content column |
| row with an image | one image | The media (single image for both variants) |

The decorative icon is drawn via CSS (flower for default, light-bulb for
`image-left`), so no icon needs to be authored. To override it, place an image
inside the content cell (before the heading) — the first image in the content
column is used as the icon and the CSS default is suppressed.

### Example (default)

| Info Feature Callout |
| --- |
| ## When you're a Girl Scout, you call the shots.<br>Every Girl Scout has their own curiosity… <br>[KNOW MORE ABOUT GIRL SCOUTS](/about) |
| ![](image.png) |

## Background (image-left)

The doodle backdrop is applied at the section level via the **Teaser Doodle**
Style option (`main .section.teaser-doodle` in `styles.css`): a light sky-blue
tint plus an optional doodle illustration. Drop the exported doodle PNG into
`icons/teaser-doodle.png` and set `--ifc-doodle` to enable the illustration
layer.

## Responsive

- Mobile (375) / Tablet (768): single column — content then image.
- Desktop (1280): two columns, 120px gap; default media is a fixed 572px-wide
  image (~4:3), image-left is a fixed 516px square.
