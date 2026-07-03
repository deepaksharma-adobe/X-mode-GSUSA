/**
 * Decorates the feature-highlight-banner block.
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  const [row] = block.children;
  const contentCell = row ? row.querySelector(':scope > div') : null;

  block.textContent = '';

  const card = document.createElement('div');
  card.classList.add('feature-highlight-banner-card');

  const daisy = document.createElement('span');
  daisy.classList.add('feature-highlight-banner-daisy');
  daisy.setAttribute('aria-hidden', 'true');

  const bulb = document.createElement('span');
  bulb.classList.add('feature-highlight-banner-bulb');
  bulb.setAttribute('aria-hidden', 'true');

  const content = document.createElement('div');
  content.classList.add('feature-highlight-banner-content');

  if (contentCell) {
    const heading = contentCell.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.classList.add('feature-highlight-banner-heading');
      content.append(heading);
    }

    const paras = [...contentCell.querySelectorAll('p')];
    const linkPara = paras.find((p) => p.querySelector('a[href]'));
    const bodyPara = paras.find((p) => p !== linkPara && p.textContent.trim());
    if (bodyPara) {
      bodyPara.classList.add('feature-highlight-banner-subtext');
      content.append(bodyPara);
    }

    const link = linkPara && linkPara.querySelector('a[href]');
    if (link) {
      link.classList.add('button', 'primary', 'feature-highlight-banner-cta');
      const cta = document.createElement('div');
      cta.classList.add('feature-highlight-banner-cta-wrapper');
      cta.append(link);
      content.append(cta);
    }
  }

  card.append(daisy, content, bulb);
  block.append(card);
}
