import createCarouselControls from '../../scripts/carousel-controls.js';

function firstMedia(cell) {
  return cell ? cell.querySelector('picture, img') : null;
}

function buildTile(row) {
  const [photoCell, labelCell, gradeCell] = [...row.children];

  const link = labelCell && labelCell.querySelector('a[href]');
  const labelText = labelCell ? labelCell.textContent.trim() : '';
  const href = link ? link.getAttribute('href') : null;
  const title = link ? link.title : '';

  const tile = document.createElement(href ? 'a' : 'div');
  tile.classList.add('shop-by-navigator-tile');
  if (href) {
    tile.href = href;
    tile.title = title;
    if (link.target) {
      tile.target = link.target;
      tile.rel = 'noopener noreferrer';
    }
  }

  // Generic decoration class(es) authored per tile drive the combined
  // background + doodle painted in CSS (e.g. "cloud-flower").
  const decoration = gradeCell ? gradeCell.textContent.trim().toLowerCase() : '';
  decoration
    .split(/\s+/)
    .filter(Boolean)
    .forEach((token) => tile.classList.add(token));

  const media = document.createElement('span');
  media.classList.add('shop-by-navigator-media');

  const photo = firstMedia(photoCell);
  if (photo) {
    const photoWrap = document.createElement('span');
    photoWrap.classList.add('shop-by-navigator-photo');
    photoWrap.append(photo.closest('picture') || photo);
    media.append(photoWrap);
  }

  const label = document.createElement('span');
  label.classList.add('shop-by-navigator-label');
  label.textContent = labelText;

  tile.append(media, label);
  return tile;
}

function centerSectionTitle(block) {
  // The section heading is authored above the block in the same section.
  // Tag it so the block's CSS can center it without relying on section metadata.
  const section = block.closest('.section');
  if (!section) return;
  const heading = section.querySelector(
    '.default-content-wrapper h1, .default-content-wrapper h2, .default-content-wrapper h3',
  );
  if (heading) heading.classList.add('shop-by-navigator-title');
}

// Build the list of unique scroll-left values — one per tile whose centred
// scroll position is distinct from all others (within 1 px). At wide viewports
// where several tiles clamp to the same boundary (0 or maxScroll), duplicates
// are dropped so every dot maps to a genuinely different content position.
function buildDotPositions(tiles, track) {
  const maxScroll = track.scrollWidth - track.clientWidth;
  if (maxScroll <= 0) return [];
  const trackRect = track.getBoundingClientRect();
  const positions = [];
  tiles.forEach((t) => {
    const tileLeft = t.getBoundingClientRect().left - trackRect.left + track.scrollLeft;
    const center = tileLeft + t.offsetWidth / 2;
    const pos = Math.max(0, Math.min(Math.round(center - track.clientWidth / 2), maxScroll));
    if (!positions.some((p) => Math.abs(p - pos) <= 1)) positions.push(pos);
  });
  return positions;
}

// Index of the dot whose scroll position is closest to the current scrollLeft.
// Snaps to first / last dot at scroll extremes so boundary tiles are always
// reachable even when their centred position equals 0 or maxScroll.
function getActiveDot(dotPositions, track) {
  if (!dotPositions.length) return 0;
  const { scrollLeft, scrollWidth, clientWidth } = track;
  const maxScroll = scrollWidth - clientWidth;
  if (scrollLeft <= 2) return 0;
  if (maxScroll > 0 && scrollLeft >= maxScroll - 2) return dotPositions.length - 1;
  return dotPositions.reduce((best, pos, i) => {
    const closer = Math.abs(pos - scrollLeft) < Math.abs(dotPositions[best] - scrollLeft);
    return closer ? i : best;
  }, 0);
}

/**
 * Decorates the shop-by-navigator block.
 * @param {Element} block - The block element
 */
export default async function decorate(block) {
  const rows = [...block.children];

  // Split rows: tiles carry a photo; the first text-only row (if any) is an
  // optional block-level heading. When no heading is authored inside the block,
  // fall back to a section heading authored above it.
  let headingRow = null;
  const tileRows = [];
  rows.forEach((row) => {
    if (row.querySelector('picture, img')) tileRows.push(row);
    else if (!headingRow && row.textContent.trim()) headingRow = row;
  });

  let heading = null;
  if (headingRow) {
    const authored = headingRow.querySelector('h1, h2, h3, h4, h5, h6');
    heading = document.createElement(authored ? authored.tagName.toLowerCase() : 'h2');
    heading.classList.add('shop-by-navigator-title');
    heading.textContent = (authored || headingRow).textContent.trim();
  } else {
    centerSectionTitle(block);
  }

  const track = document.createElement('div');
  track.classList.add('shop-by-navigator-track');

  tileRows.forEach((row) => track.append(buildTile(row)));

  // Clear the authored rows now that heading + tiles have been extracted.
  rows.forEach((row) => row.remove());

  if (heading) block.prepend(heading);
  block.append(track);

  const tiles = [...track.querySelectorAll('.shop-by-navigator-tile')];
  if (tiles.length <= 1) return;

  let controls = null;
  let lastDotCount = 0;
  // Outer variable so onSelect always reads the latest positions after resize.
  let dotPositions = [];

  function update() {
    const overflows = track.scrollWidth > track.clientWidth + 1;
    block.classList.toggle('sbn-carousel', overflows);

    if (!overflows) {
      if (controls) {
        controls.dotsNav.remove();
        controls = null;
        lastDotCount = 0;
        dotPositions = [];
      }
      return;
    }

    dotPositions = buildDotPositions(tiles, track);
    const count = dotPositions.length;
    if (!count) return;

    if (count !== lastDotCount) {
      if (controls) controls.dotsNav.remove();
      lastDotCount = count;
      controls = createCarouselControls({
        prefix: 'shop-by-navigator',
        count,
        label: 'Choose a grade',
        itemNoun: 'grade',
        onSelect: (i) => {
          // dotPositions is the outer let — always current after any resize.
          track.scrollTo({ left: dotPositions[i], behavior: 'smooth' });
        },
      });
      block.append(controls.dotsNav);
    }

    controls.setActive(getActiveDot(dotPositions, track));
  }

  update();

  let scrollRaf;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(scrollRaf);
    scrollRaf = requestAnimationFrame(() => controls?.setActive(getActiveDot(dotPositions, track)));
  });

  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => update());
    ro.observe(track);
  } else {
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => update(), 100);
    });
  }
}
