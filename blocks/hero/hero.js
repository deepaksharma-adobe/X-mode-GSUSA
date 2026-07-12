/**
 * Decorates the hero block.
 * @param {Element} block - The block element
 */
function readLinkData(link) {
  if (!link?.getAttribute('href')) return null;
  return {
    href: link.getAttribute('href'),
    target: link.getAttribute('target'),
    label: link.getAttribute('title') || link.getAttribute('aria-label') || link.textContent.trim(),
  };
}

function wrapImageLink(imageEl, block, linkData) {
  if (!linkData?.href) return false;

  const wrapper = document.createElement('a');
  wrapper.href = linkData.href;
  if (linkData.target) wrapper.setAttribute('target', linkData.target);
  if (linkData.label) wrapper.setAttribute('aria-label', linkData.label);
  wrapper.classList.add('hero-link');

  imageEl.replaceWith(wrapper);
  wrapper.append(imageEl);
  block.classList.add('hero--linked');
  return true;
}

export default async function decorate(block) {
  const row = block.querySelector(':scope > div');
  const cell = row?.querySelector(':scope > div') || row;
  if (!cell) return;

  const picture = cell.querySelector('picture, img');
  const text = document.createElement('div');
  text.classList.add('hero-text');

  if (picture) {
    const imageLink = picture.closest('a[href]');
    const imageLinkData = readLinkData(imageLink);
    const imageParagraph = picture.closest('p');
    const image = document.createElement('div');
    image.classList.add('hero-image');
    image.append(picture.closest('picture') || picture);
    if (imageParagraph) imageParagraph.remove();

    [...cell.childNodes].forEach((node) => text.append(node));
    row.remove();
    block.append(image);

    const showText = text.textContent.trim();
    if (showText) {
      block.append(text);
      if (imageLinkData) {
        const heading = text.querySelector('h1, h2, h3, h4, h5, h6');
        if (!imageLinkData.label && heading?.textContent.trim()) {
          imageLinkData.label = heading.textContent.trim();
        }
        wrapImageLink(image, block, imageLinkData);
      }
    } else {
      block.classList.add('hero--image-only');
      if (!wrapImageLink(image, block, imageLinkData)) {
        wrapImageLink(image, block, readLinkData(text.querySelector('a[href]')));
      }
    }
    return;
  }

  [...cell.childNodes].forEach((node) => text.append(node));
  row.remove();
  if (text.textContent.trim()) block.append(text);
}
