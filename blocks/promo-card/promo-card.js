/**
 * Decorates the promo-card block.
 * Content model — one row, three cells:
 *   1. image (the product photo)
 *   2. heading (rich text, e.g. "New Arrivals")
 *   3. CTA (a link, e.g. "Shop All Collection")
 * Variation classes: `vertical` (portrait card) — default is horizontal (wide banner).
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  const [row] = block.children;
  const cells = row ? [...row.children] : [];
  const [imageCell, headingCell, ctaCell] = cells;

  block.textContent = '';

  const card = document.createElement('div');
  card.classList.add('promo-card-card');

  // Text column — heading + CTA sit above the image
  const content = document.createElement('div');
  content.classList.add('promo-card-content');

  if (headingCell && headingCell.textContent.trim()) {
    // Keep the full authored heading (all lines/paragraphs, e.g. "New" + "Arrivals")
    const heading = document.createElement('div');
    heading.classList.add('promo-card-heading');
    heading.append(...headingCell.childNodes);
    content.append(heading);
  }

  const link = ctaCell && ctaCell.querySelector('a[href]');
  if (link) {
    link.classList.add('promo-card-cta');
    content.append(link);
  }

  card.append(content);

  // Product photo — bleeds into the card corner
  const media = imageCell && imageCell.querySelector('picture, img');
  if (media) {
    const figure = document.createElement('div');
    figure.classList.add('promo-card-media');
    figure.append(media.closest('picture') || media);
    card.append(figure);
  }

  block.append(card);
}
