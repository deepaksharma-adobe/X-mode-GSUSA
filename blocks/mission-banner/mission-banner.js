export default async function decorate(block) {
  const isArt = block.classList.contains('art');
  const [row] = block.children;
  const contentCell = row ? row.querySelector(':scope > div') : null;

  block.textContent = '';

  const card = document.createElement('div');
  card.classList.add('mission-banner-card');

  if (isArt) {
    const signpost = document.createElement('span');
    signpost.classList.add('mission-banner-signpost');
    signpost.setAttribute('aria-hidden', 'true');
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
    card.append(flower);
  }

  block.append(card);
}
