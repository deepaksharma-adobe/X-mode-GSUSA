// Read an optional authored illustration override from a labelled row
// (e.g. "Signpost" | <image>). Returns the image source, or '' when absent.
function readIllustration(rows, label) {
  const row = rows.find((r) => r.children[0]?.textContent.trim().toLowerCase() === label);
  const img = row?.querySelector('img');
  return img?.getAttribute('src') || '';
}

export default async function decorate(block) {
  const isArt = block.classList.contains('art');
  const rows = [...block.children];

  // Optional authored art overrides; fall back to the default SVGs in CSS.
  const signpostSrc = readIllustration(rows, 'signpost');
  const flowerSrc = readIllustration(rows, 'flower');

  // Content is the row that isn't a signpost/flower illustration row.
  const contentRow = rows.find((r) => {
    const key = r.children[0]?.textContent.trim().toLowerCase();
    return key !== 'signpost' && key !== 'flower';
  });
  const contentCell = contentRow ? contentRow.querySelector(':scope > div') : null;

  block.textContent = '';

  const card = document.createElement('div');
  card.classList.add('mission-banner-card');

  if (isArt) {
    const signpost = document.createElement('span');
    signpost.classList.add('mission-banner-signpost');
    signpost.setAttribute('aria-hidden', 'true');
    if (signpostSrc) signpost.style.backgroundImage = `url("${signpostSrc}")`;
    card.append(signpost);
  }

  const content = document.createElement('div');
  content.classList.add('mission-banner-content');

  if (contentCell) {
    const heading = contentCell.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.classList.add('mission-banner-heading');
      content.append(heading);
    }

    const paras = [...contentCell.querySelectorAll('p')];
    const linkPara = paras.find((p) => p.querySelector('a[href]'));
    const bodyPara = paras.find((p) => p !== linkPara && p.textContent.trim());
    if (bodyPara) {
      bodyPara.classList.add('mission-banner-body');
      content.append(bodyPara);
    }

    const link = linkPara && linkPara.querySelector('a[href]');
    if (link) {
      link.classList.add('button', 'mission-banner-cta');
      const cta = document.createElement('div');
      cta.classList.add('mission-banner-cta-wrapper');
      cta.append(link);
      card.append(content, cta);
    } else {
      card.append(content);
    }
  }

  if (isArt) {
    const flower = document.createElement('span');
    flower.classList.add('mission-banner-flower');
    flower.setAttribute('aria-hidden', 'true');
    if (flowerSrc) flower.style.backgroundImage = `url("${flowerSrc}")`;
    card.append(flower);
  }

  block.append(card);
}
