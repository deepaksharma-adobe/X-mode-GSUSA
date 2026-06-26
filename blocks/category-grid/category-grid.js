const LABEL_COLORS = new Set([
  'yellow', 'pink', 'cyan', 'purple', 'mint', 'peach', 'orange', 'gold', 'sky',
]);

const SIZE_CLASSES = new Set(['tile', 'wide', 'third']);

function readOptions(cell) {
  const opts = { color: '', size: '' };
  if (!cell) return opts;
  cell.textContent.split(/\s+/).forEach((word) => {
    const w = word.trim().toLowerCase();
    if (LABEL_COLORS.has(w)) opts.color = w;
    else if (SIZE_CLASSES.has(w)) opts.size = w;
  });
  return opts;
}

export default async function decorate(block) {
  const rows = [...block.children];

  rows.forEach((row) => {
    const cells = [...row.children];
    const imageCell = cells[0];
    const contentCell = cells[1];

    const card = document.createElement('div');
    card.classList.add('category-grid-card');

    // Media (first cell)
    if (imageCell) {
      const media = document.createElement('div');
      media.classList.add('category-grid-media');
      const pic = imageCell.querySelector('picture');
      if (pic) media.append(pic);
      card.append(media);
    }

    const hasHeading = contentCell && contentCell.querySelector('h1, h2, h3, h4, h5, h6');
    const hasLink = contentCell && contentCell.querySelector('a[href]');

    if (hasHeading && hasLink) {
      // Banner card — overlaid content, options come from cell 3.
      card.classList.add('category-grid-banner');
      const content = document.createElement('div');
      content.classList.add('category-grid-content');
      content.append(...contentCell.childNodes);
      card.append(content);

      const link = content.querySelector('a[href]');
      const wrapper = link.closest('p') || link.parentElement;
      wrapper.classList.add('category-grid-cta-wrapper');
      link.classList.add('button', 'text-secondary', 'category-grid-cta');

      const { size } = readOptions(cells[2]);
      if (size) card.dataset.size = size;
    } else if (contentCell) {
      // Label card — colored bar; options come from cell 3.
      card.classList.add('category-grid-label');

      const { color, size } = readOptions(cells[2]);
      if (color) card.dataset.color = color;
      if (size) card.dataset.size = size;

      const bar = document.createElement('div');
      bar.classList.add('category-grid-label-bar');
      bar.append(...contentCell.childNodes);

      // If the label provides a link, the whole tile (image + bar) is clickable.
      const link = bar.querySelector('a[href]');
      if (link) {
        const href = link.getAttribute('href');
        link.replaceWith(...link.childNodes);
        const anchor = document.createElement('a');
        anchor.href = href;
        anchor.classList.add('category-grid-link');
        const media = card.querySelector('.category-grid-media');
        if (media) anchor.append(media);
        anchor.append(bar);
        card.append(anchor);
      } else {
        card.append(bar);
      }
    }

    row.replaceWith(card);
  });
}
