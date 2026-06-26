/**
 * Campaign Highlights (Figma 2831:51217 — desktop 2824:51131 / mobile 2831:51218
 * / tablet 2908:17857)
 *
 * A horizontal scroll carousel of alternating 256×332 tiles: image tiles and
 * colored text panels, over a sky-blue doodle background. Above the track sits a
 * centered heading + subheading; below it a centered "KNOW MORE" CTA. Prev/next
 * arrows drive the track on desktop; a dynamic dot pager drives it on mobile.
 * The carousel loops infinitely (cloned tile sets wrap seamlessly). No autoplay.
 *
 * Authoring contract (each block row):
 *   - First text-only row            → heading (line 1) + subheading (line 2)
 *   - Rows with an image             → one tile pair: image tile + text tile
 *                                      (cell 1 = image, cell 2 = panel richtext)
 *   - A text-only row with a link    → the shared "KNOW MORE" CTA
 *
 * Text panels cycle a fixed palette (cream → lavender → yellow) in author order
 * via the `data-tone` attribute; image tiles carry a 1px border in the matching
 * tone. The block owns the scroll engine; the shared carousel-controls util
 * builds the dots + arrows.
 */
import createCarouselControls from '../../scripts/carousel-controls.js';

// Text-panel tones cycling cream → lavender → yellow (Figma)
const PANEL_TONES = ['cream', 'lavender', 'yellow'];

let carouselId = 0;

function buildImageTile(imageCell, tone) {
  const tile = document.createElement('li');
  tile.className = 'campaign-highlights-tile campaign-highlights-tile-image';
  tile.dataset.tone = tone;
  tile.setAttribute('role', 'group');
  tile.setAttribute('aria-roledescription', 'slide');

  // Inner card carries the tilt; the tile container absorbs rotation overflow.
  const card = document.createElement('div');
  card.className = 'campaign-highlights-card';
  card.dataset.tone = tone;

  const media = document.createElement('div');
  media.className = 'campaign-highlights-media';
  const pic = imageCell?.querySelector('picture');
  if (pic) media.append(pic);
  card.append(media);
  tile.append(card);
  return tile;
}

function buildTextTile(textCell, tone) {
  const tile = document.createElement('li');
  tile.className = 'campaign-highlights-tile campaign-highlights-tile-text';
  tile.dataset.tone = tone;
  tile.setAttribute('role', 'group');
  tile.setAttribute('aria-roledescription', 'slide');

  const card = document.createElement('div');
  card.className = 'campaign-highlights-card';
  card.dataset.tone = tone;

  const panel = document.createElement('div');
  panel.className = 'campaign-highlights-panel';
  if (textCell) panel.append(...textCell.childNodes);
  card.append(panel);
  tile.append(card);
  return tile;
}

export default function decorate(block) {
  carouselId += 1;
  const uid = `campaign-highlights-${carouselId}`;
  const rows = [...block.children];

  let headingRow = null;
  let ctaRow = null;
  const tileRows = [];
  rows.forEach((row) => {
    if (row.querySelector('picture')) tileRows.push(row);
    else if (row.querySelector('a[href]')) ctaRow = row;
    else if (!headingRow) headingRow = row;
  });

  // Flatten authored [image | text] rows into the alternating tile sequence.
  // Each pair shares one tone (image border matches its text panel).
  const tiles = [];
  let toneIndex = 0;
  tileRows.forEach((row) => {
    const cells = [...row.children];
    const tone = PANEL_TONES[toneIndex % PANEL_TONES.length];
    tiles.push(buildImageTile(cells[0], tone));
    if (cells[1]) {
      tiles.push(buildTextTile(cells[1], tone));
      toneIndex += 1;
    }
  });
  const count = tiles.length;

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');

  // ----- Heading + subheading -----
  if (headingRow) {
    const head = document.createElement('div');
    head.className = 'campaign-highlights-head';
    const paras = [...headingRow.querySelectorAll('p, h1, h2, h3, h4, h5, h6')];
    const heading = document.createElement('h2');
    heading.className = 'campaign-highlights-heading';
    heading.textContent = (paras[0]?.textContent || headingRow.textContent || '').trim();
    head.append(heading);
    if (paras[1]) {
      const sub = document.createElement('p');
      sub.className = 'campaign-highlights-subheading';
      sub.textContent = paras[1].textContent.trim();
      head.append(sub);
    }
    block.append(head);
  }

  // ----- Track (with cloned sets on each side for infinite looping) -----
  const viewport = document.createElement('div');
  viewport.className = 'campaign-highlights-viewport';
  const track = document.createElement('ul');
  track.className = 'campaign-highlights-track';
  track.id = `${uid}-track`;

  const cloneSet = () => tiles.map((tile) => {
    const c = tile.cloneNode(true);
    c.removeAttribute('id');
    c.setAttribute('aria-hidden', 'true');
    c.classList.add('campaign-highlights-tile-clone');
    return c;
  });

  // Infinite loop is opt-in via the "infinite-loop" block variant (class).
  // Default: a finite track with arrows disabling at the ends.
  const loop = count > 1 && block.classList.contains('infinite-loop');
  const clonesBefore = loop ? cloneSet() : [];
  const clonesAfter = loop ? cloneSet() : [];
  tiles.forEach((tile, i) => { tile.id = `${uid}-tile-${i}`; });
  const allTiles = [...clonesBefore, ...tiles, ...clonesAfter];
  allTiles.forEach((tile) => track.append(tile));
  viewport.append(track);

  // ----- Geometry helpers -----
  const pos = (tile) => tile.offsetLeft - track.offsetLeft;
  let leftBound = 0;
  let setWidth = 0;

  const recalc = () => {
    if (!tiles[0]) return;
    leftBound = pos(tiles[0]);
    setWidth = loop ? pos(clonesAfter[0]) - leftBound : 0;
    block.style.setProperty('--ch-arrow-top', `${Math.round(tiles[0].getBoundingClientRect().height / 2)}px`);
  };

  const activeIndex = () => {
    const rel = loop
      ? (((track.scrollLeft - leftBound) % setWidth) + setWidth) % setWidth
      : track.scrollLeft - leftBound;
    let best = 0;
    let bestDist = Infinity;
    tiles.forEach((tile, i) => {
      const d = Math.abs((pos(tile) - leftBound) - rel);
      if (d < bestDist) { bestDist = d; best = i; }
    });
    return best;
  };

  const nearestAll = () => {
    let best = 0;
    let bestDist = Infinity;
    allTiles.forEach((tile, idx) => {
      const d = Math.abs(pos(tile) - track.scrollLeft);
      if (d < bestDist) { bestDist = d; best = idx; }
    });
    return best;
  };

  const scrollAdjacent = (dir) => {
    const target = allTiles[nearestAll() + dir];
    if (target) track.scrollTo({ left: pos(target), behavior: 'smooth' });
  };

  const controls = createCarouselControls({
    prefix: 'campaign-highlights',
    count,
    controls: track.id,
    label: 'Campaign highlight controls',
    itemNoun: 'highlight',
    prevLabel: 'Previous highlights',
    nextLabel: 'Next highlights',
    loop,
    onSelect: (i) => track.scrollTo({ left: pos(tiles[i]), behavior: 'smooth' }),
    onPrev: () => scrollAdjacent(-1),
    onNext: () => scrollAdjacent(1),
  });
  viewport.append(controls.prev, controls.next);
  // Order: track → dots (mobile) → CTA, matching Figma.
  block.append(viewport, controls.dotsNav);

  // ----- Shared CTA -----
  if (ctaRow) {
    const cta = document.createElement('div');
    cta.className = 'campaign-highlights-cta-wrapper';
    const link = ctaRow.querySelector('a[href]');
    link.classList.add('button', 'secondary', 'campaign-highlights-cta');
    cta.append(link);
    block.append(cta);
  }

  // Seamless wrap: jump a whole set width when scroll crosses into a clone
  // region. Clones are pixel-identical, so the jump is invisible.
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
    controls.setActive(activeIndex());
  };

  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', () => { recalc(); sync(); });

  const init = () => {
    recalc();
    if (loop) track.scrollLeft = leftBound;
    controls.setActive(0);
  };

  requestAnimationFrame(init);
  allTiles.forEach((tile) => {
    const img = tile.querySelector('img');
    if (img && !img.complete) img.addEventListener('load', init, { once: true });
  });
}
