/**
 * Shop By Collection (Figma 5168:208534)
 *
 * A horizontally-scrolling carousel of collection cards. Each block row is one
 * card: cell 1 = image, cell 2 = content (heading + a "Collection" link).
 * The section heading ("Shop By Collection") is authored as default content
 * above the block (a sibling h2), matching the category-grid pattern.
 *
 * Behaviour: prev/next arrows scroll the track by one card; dot indicators map
 * to card positions; the active dot and arrow disabled-states stay in sync with
 * the scroll position. No autoplay. Dots + arrows come from the shared
 * carousel-controls util; this block owns the scroll engine.
 */
import createCarouselControls from '../../scripts/carousel-controls.js';

let carouselId = 0;

function buildCard(row) {
  const cells = [...row.children];
  const imageCell = cells[0];
  const contentCell = cells[1];

  const card = document.createElement('li');
  card.className = 'shop-by-collection-card';
  card.setAttribute('role', 'group');
  card.setAttribute('aria-roledescription', 'slide');

  if (imageCell) {
    const media = document.createElement('div');
    media.className = 'shop-by-collection-media';
    const pic = imageCell.querySelector('picture');
    if (pic) media.append(pic);
    card.append(media);
  }

  if (contentCell) {
    const content = document.createElement('div');
    content.className = 'shop-by-collection-content';
    content.append(...contentCell.childNodes);

    const heading = content.querySelector('h1, h2, h3, h4, h5, h6');
    if (heading) {
      heading.classList.add('shop-by-collection-title');
      card.setAttribute('aria-label', heading.textContent.trim());
    }

    const link = content.querySelector('a[href]');
    if (link) {
      const wrapper = link.closest('p') || link.parentElement;
      if (wrapper && wrapper !== content) wrapper.classList.add('shop-by-collection-cta-wrapper');
      link.classList.add('button', 'text-secondary', 'shop-by-collection-cta');
      // Wrap the label so the underline applies to text only, not the arrow.
      const labelText = (link.textContent || '').trim();
      const labelSpan = document.createElement('span');
      labelSpan.className = 'shop-by-collection-cta-text';
      labelSpan.textContent = labelText;
      link.textContent = '';
      link.append(labelSpan);
    }

    card.append(content);
  }

  return card;
}

export default function decorate(block) {
  carouselId += 1;
  const uid = `shop-by-collection-${carouselId}`;

  const rows = [...block.children];
  const cards = rows
    .filter((row) => row.querySelector('picture, a[href]'))
    .map((row) => buildCard(row));

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');

  // Infinite loop is opt-in via the "infinite-loop" block variant (class).
  // Default: a finite scroll track with arrows disabling at the ends.
  const loop = cards.length > 1 && block.classList.contains('infinite-loop');

  // ----- Track -----
  const viewport = document.createElement('div');
  viewport.className = 'shop-by-collection-viewport';

  const track = document.createElement('ul');
  track.className = 'shop-by-collection-track';
  track.id = `${uid}-track`;
  cards.forEach((card, i) => {
    card.id = `${uid}-card-${i}`;
    track.append(card);
  });

  // When looping, flank the real cards with cloned sets so the track can wrap
  // seamlessly (clones are pixel-identical, so the reset jump is invisible).
  const cloneSet = () => cards.map((card) => {
    const c = card.cloneNode(true);
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.classList.add('shop-by-collection-card-clone');
    return c;
  });
  const clonesAfter = loop ? cloneSet() : [];
  if (loop) {
    cloneSet().forEach((c) => track.prepend(c));
    clonesAfter.forEach((c) => track.append(c));
  }
  viewport.append(track);

  // ----- Behaviour -----
  const gap = () => parseFloat(getComputedStyle(track).columnGap || '0') || 0;
  const step = () => (cards[0] ? cards[0].getBoundingClientRect().width + gap() : 0);
  const pos = (card) => card.offsetLeft - track.offsetLeft;
  let leftBound = 0; // scrollLeft of the first real card
  let setWidth = 0; // width of one full card set (incl. trailing gap)

  const recalc = () => {
    if (!cards[0]) return;
    leftBound = loop ? pos(cards[0]) : 0;
    setWidth = loop && clonesAfter[0] ? pos(clonesAfter[0]) - leftBound : 0;
  };

  const scrollToCard = (i) => {
    const card = cards[i];
    if (card) track.scrollTo({ left: pos(card), behavior: 'smooth' });
  };

  // Shared dot pager + arrows; this block drives them from scroll position.
  const controls = createCarouselControls({
    prefix: 'shop-by-collection',
    count: cards.length,
    controls: track.id,
    label: 'Collection slide controls',
    itemNoun: 'collection',
    prevLabel: 'Previous collections',
    nextLabel: 'Next collections',
    loop,
    onSelect: (i) => scrollToCard(i),
    onPrev: () => track.scrollBy({ left: -step(), behavior: 'smooth' }),
    onNext: () => track.scrollBy({ left: step(), behavior: 'smooth' }),
  });

  block.append(viewport, controls.prev, controls.next, controls.dotsNav);

  // Seamless wrap when looping: jump a whole set width at the clone boundaries.
  const wrap = () => {
    if (!loop || !setWidth) return;
    if (track.scrollLeft <= leftBound - 1) track.scrollLeft += setWidth;
    else if (track.scrollLeft >= leftBound + setWidth - 1) track.scrollLeft -= setWidth;
  };

  const sync = () => {
    wrap();
    if (!loop) {
      const maxScroll = track.scrollWidth - track.clientWidth;
      controls.setArrowsDisabled(track.scrollLeft <= 1, track.scrollLeft >= maxScroll - 1);
    }
    // Active = nearest card to the current scroll position (ring-relative when looping).
    const s = step();
    const rel = loop && setWidth
      ? (((track.scrollLeft - leftBound) % setWidth) + setWidth) % setWidth
      : track.scrollLeft;
    const i = s ? Math.round(rel / s) : 0;
    controls.setActive(Math.min(Math.max(i, 0), cards.length - 1));
    // Centre the arrows on the image band (image height varies per breakpoint).
    const media = cards[0]?.querySelector('.shop-by-collection-media');
    if (media) block.style.setProperty('--sbc-arrow-top', `${Math.round(media.getBoundingClientRect().height / 2)}px`);
  };

  // Keep dots + arrows in sync with the scroll position.
  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', () => { recalc(); sync(); });

  const init = () => {
    recalc();
    if (loop) track.scrollLeft = leftBound;
    controls.setActive(0);
    sync();
  };

  controls.setActive(0);
  // Re-sync once layout settles and again as each card image loads, since the
  // track's scrollWidth (and thus the next-arrow state) depends on image size.
  requestAnimationFrame(init);
  track.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', init, { once: true });
  });
}
