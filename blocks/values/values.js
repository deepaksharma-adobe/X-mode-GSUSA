export default async function decorate(block) {
  const rows = [...block.children];

  const grid = document.createElement('div');
  grid.classList.add('values-grid');

  const cardsWrap = document.createElement('div');
  cardsWrap.classList.add('values-cards');
  grid.append(cardsWrap);

  rows.forEach((row) => {
    const cells = [...row.children];
    const [iconCell, textCell] = cells;

    const card = document.createElement('div');
    card.classList.add('values-card');

    if (iconCell) {
      const icon = iconCell.querySelector('picture, img');
      if (icon) {
        const figure = document.createElement('div');
        figure.classList.add('values-card-icon');
        figure.append(icon.closest('picture') || icon);
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

  // Decorative wave + trees header (Figma node 5168:208599).
  // Wave is full-bleed; trees sit inside the centered grid frame.
  const header = document.createElement('div');
  header.classList.add('values-header');
  header.setAttribute('aria-hidden', 'true');
  const headerInner = document.createElement('div');
  headerInner.classList.add('values-header-inner');
  const trees = document.createElement('span');
  trees.classList.add('values-header-trees');
  headerInner.append(trees);
  header.append(headerInner);

  block.append(header, grid);
}
