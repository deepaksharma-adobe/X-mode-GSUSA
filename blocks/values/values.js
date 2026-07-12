import { decorateWave, extractIllustrations, readWaveConfig } from '../../scripts/wave/wave.js';

function isHeadingRow(cells) {
  const hasHeading = cells.some((cell) => cell.querySelector('h1, h2, h3, h4, h5, h6'));
  const hasIcon = cells.some((cell) => cell.querySelector('picture, img, .icon'));
  return hasHeading && !hasIcon;
}

function buildHeading(row, cells) {
  const heading = document.createElement('div');
  heading.classList.add('values-heading');
  cells.forEach((cell) => {
    const el = cell.querySelector('h1, h2, h3, h4, h5, h6');
    if (el) heading.append(el);
    else heading.append(...cell.childNodes);
  });
  row.remove();
  return heading;
}

export default async function decorate(block) {
  const rows = [...block.children];

  const grid = document.createElement('div');
  grid.classList.add('values-grid');

  const cardsWrap = document.createElement('div');
  cardsWrap.classList.add('values-cards');
  grid.append(cardsWrap);

  // Optional authored wave illustrations (rows labelled "Illustration [Left|Right]", any position)
  const { illustrations, configRows } = extractIllustrations(rows);
  // Wave key/value rows (e.g. "Wave curve") are config, not cards.
  const waveConfig = readWaveConfig(block);

  rows.forEach((row) => {
    if (configRows.has(row)) {
      row.remove();
      return;
    }

    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase() || '';
    if (key.startsWith('wave ')) {
      row.remove();
      return;
    }

    if (isHeadingRow(cells)) {
      grid.insertBefore(buildHeading(row, cells), cardsWrap);
      return;
    }

    const [iconCell, textCell] = cells;
    const card = document.createElement('div');
    card.classList.add('values-card');

    if (iconCell) {
      const icon = iconCell.querySelector('picture, img, .icon');
      if (icon) {
        const figure = document.createElement('div');
        figure.classList.add('values-card-icon');
        figure.append(icon.closest('picture') || icon.closest('.icon') || icon);
        card.append(figure);
      }
    }

    if (textCell) {
      const text = document.createElement('div');
      text.classList.add('values-card-text');
      const paras = [...textCell.querySelectorAll('p')];
      paras.forEach((p, idx) => {
        p.classList.add(idx === 0 ? 'values-card-title' : 'values-card-subtext');
        text.append(p);
      });
      if (!paras.length) text.append(...textCell.childNodes);
      card.append(text);
    }

    cardsWrap.append(card);
    row.remove();
  });

  block.append(grid);

  // Decorative wave header via the shared util — green wave + illustration(s)
  if (!block.classList.contains('flat')) {
    if (!illustrations.length) {
      const trees = document.createElement('img');
      trees.src = `${window.hlx.codeBasePath}/icons/values-trees.svg`;
      trees.setAttribute('loading', 'lazy');
      illustrations.push({ el: trees, alt: '', side: 'right' });
    }

    // Curve direction is authorable via a "Wave curve" row (peak-left | peak-right);
    // defaults to peak-right.
    decorateWave(block, {
      position: 'top',
      curve: waveConfig.curve || 'peak-right',
      illustrations,
    });
  }
}
