/**
 * Info Feature Callout (Figma 2734:46116 default / 5168:284082 image-left)
 *
 * A 50-50 teaser: a content column (decorative icon, heading, divider, body,
 * CTA) beside a media column. Two layouts share one block:
 *   - Default      → content left, a 3-image collage right (stacks below the
 *                    content on tablet/mobile).
 *   - .image-left  → a single square image left, content right; sits on the
 *                    section-level doodle backdrop ("Teaser Doodle" Style).
 *   - .list        → a row of feature cards (authored icon + heading + body),
 *                    3-up on desktop, stacking on mobile, with a shared CTA.
 *
 * Authoring contract (default / image-left):
 *   - First row (single cell) = content richtext: heading, body paragraph, and
 *     a CTA link. The decorative icon is drawn via CSS (flower default,
 *     light-bulb for .image-left).
 *   - A second row's first cell = one image (the media). Both variants use a
 *     single image — the multi-photo collage is one authored/exported image.
 *
 * Authoring contract (.list):
 *   - Each row with an image = one feature card: cell 1 = icon image,
 *     cell 2 = richtext (heading + body).
 *   - A trailing text-only row with a link = the shared CTA.
 */
function decorateList(block) {
  const rows = [...block.children];
  block.textContent = '';

  const grid = document.createElement('div');
  grid.className = 'info-feature-callout-list-grid';

  let ctaRow = null;
  rows.forEach((row) => {
    const cells = [...row.children];
    const iconCell = cells[0];
    const pic = iconCell?.querySelector('picture, img');
    if (!pic) {
      if (row.querySelector('a[href]')) ctaRow = row;
      return;
    }

    const card = document.createElement('div');
    card.className = 'info-feature-callout-feature';

    const icon = document.createElement('div');
    icon.className = 'info-feature-callout-feature-icon';
    icon.append(pic.closest('picture') || pic);
    card.append(icon);

    const textCell = cells[1];
    if (textCell) {
      const heading = textCell.querySelector('h1, h2, h3, h4, h5, h6');
      if (heading) {
        heading.classList.add('info-feature-callout-feature-heading');
        card.append(heading);
      }
      textCell.querySelectorAll('p').forEach((p) => {
        if (p.textContent.trim()) {
          p.classList.add('info-feature-callout-feature-body');
          card.append(p);
        }
      });
    }
    grid.append(card);
  });

  block.append(grid);

  const link = ctaRow && ctaRow.querySelector('a[href]');
  if (link) {
    // Defer to an author-chosen button style; default to a text link.
    if (!link.classList.contains('button')) {
      link.classList.add('button', 'text-secondary', 'info-feature-callout-cta');
    }
    const labelText = (link.textContent || '').trim();
    const labelSpan = document.createElement('span');
    labelSpan.className = 'info-feature-callout-cta-text';
    labelSpan.textContent = labelText;
    link.textContent = '';
    link.append(labelSpan);
    const wrapper = document.createElement('div');
    wrapper.className = 'info-feature-callout-cta-wrapper';
    wrapper.append(link);
    block.append(wrapper);
  }
}

export default function decorate(block) {
  if (block.classList.contains('list')) {
    decorateList(block);
    return;
  }

  const imageLeft = block.classList.contains('image-left');
  const rows = [...block.children];

  // The content row has the heading; the remaining image-only row is the media.
  let contentRow = rows.find((row) => row.querySelector('h1, h2, h3, h4, h5, h6'));
  const mediaRows = rows.filter((row) => row !== contentRow && row.querySelector('picture, img'));
  if (!contentRow) [contentRow] = rows;

  block.textContent = '';

  // ----- Media column (single image; the collage is one authored image) -----
  const media = document.createElement('div');
  media.className = 'info-feature-callout-media';
  const pic = mediaRows
    .map((row) => row.querySelector('picture') || row.querySelector('img'))
    .find(Boolean);
  if (pic) {
    const fig = document.createElement('div');
    fig.className = 'info-feature-callout-figure';
    fig.append(pic.closest('picture') || pic);
    media.append(fig);
  }

  // ----- Content column -----
  const content = document.createElement('div');
  content.className = 'info-feature-callout-content';

  // Icon — an authored image in the content cell is used as the icon; otherwise
  // the CSS-drawn default (flower / light-bulb) shows.
  const contentCell = contentRow
    ? (contentRow.querySelector(':scope > div') || contentRow)
    : null;
  const iconPic = contentCell && (contentCell.querySelector('picture') || contentCell.querySelector('img'));
  const icon = document.createElement('span');
  icon.className = 'info-feature-callout-icon';
  icon.setAttribute('aria-hidden', 'true');
  if (iconPic) {
    icon.classList.add('info-feature-callout-icon-image');
    icon.append(iconPic.closest('picture') || iconPic);
  }
  content.append(icon);

  if (contentRow) {
    const cell = contentRow.querySelector(':scope > div') || contentRow;

    const heading = cell.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.classList.add('info-feature-callout-heading');
      content.append(heading);
    }

    // Divider sits between heading and body (decorative).
    const divider = document.createElement('span');
    divider.className = 'info-feature-callout-divider';
    divider.setAttribute('aria-hidden', 'true');
    content.append(divider);

    const paras = [...cell.querySelectorAll('p')];
    const linkPara = paras.find((p) => p.querySelector('a[href]'));
    const bodyPara = paras.find((p) => p !== linkPara && p.textContent.trim());
    if (bodyPara) {
      bodyPara.classList.add('info-feature-callout-body');
      content.append(bodyPara);
    }

    const link = linkPara && linkPara.querySelector('a[href]');
    if (link) {
      const labelText = (link.textContent || '').trim();
      const labelSpan = document.createElement('span');
      labelSpan.className = 'info-feature-callout-cta-text';
      labelSpan.textContent = labelText;
      link.textContent = '';
      link.append(labelSpan);
      // Respect author-chosen button styles: decorateButtons (scripts.js) maps
      // **bold**→primary, *italic*→secondary, ***both***→accent before blocks
      // decorate, so a formatted link already carries its design-system class.
      // Only when the author left the link plain do we apply the variant
      // default — image-left → bordered secondary button; default → text link.
      if (!link.classList.contains('button')) {
        if (imageLeft) link.classList.add('button', 'secondary', 'info-feature-callout-cta');
        else link.classList.add('button', 'text-secondary', 'info-feature-callout-cta');
      }

      const wrapper = document.createElement('div');
      wrapper.className = 'info-feature-callout-cta-wrapper';
      wrapper.append(link);
      content.append(wrapper);
    }
  }

  // Order: image-left → media then content; default → content then media.
  if (imageLeft) block.append(media, content);
  else block.append(content, media);
}
