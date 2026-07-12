import { decorateIcons } from '../../scripts/aem.js';

/**
 * Decorates the promo-list block.
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  const list = document.createElement('ul');
  list.className = 'promo-list-items';

  [...block.children].forEach((row) => {
    const [iconCell, textCell] = [...row.children];

    const item = document.createElement('li');
    item.className = 'promo-list-item';

    const iconWrap = document.createElement('div');
    iconWrap.className = 'promo-list-icon';
    const iconContent = iconCell?.querySelector('picture, img, .icon');
    if (iconContent) iconWrap.append(iconContent);

    const text = document.createElement('div');
    text.className = 'promo-list-text';
    if (textCell) {
      [...textCell.childNodes].forEach((node) => text.append(node));
    }

    item.append(iconWrap, text);
    list.append(item);

    row.remove();
  });

  block.append(list);
  decorateIcons(block);
}
