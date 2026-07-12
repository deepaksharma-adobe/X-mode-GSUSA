import { search } from '@dropins/storefront-product-discovery/api.js';
import { getRootPath } from '@dropins/tools/lib/aem/configs.js';
import { loadFragment } from '../fragment/fragment.js';
import { renderProductCard, prepareProductCardContext } from '../../scripts/components/commerce-product-card/commerce-product-card.js';
import { decorateWave, extractIllustrations } from '../../scripts/wave/wave.js';
import createCarouselControls from '../../scripts/carousel-controls.js';
import '../../scripts/initializers/search.js';

const DEFAULT_MAX_ITEMS = 4;
const NO_PRODUCTS_MESSAGE = 'No products available in this collection right now.';
const PRODUCTS_LOAD_ERROR = "We couldn't load these products. Please try again.";
// Incremented per block instance to generate unique ARIA IDs when multiple blocks appear on a page
let instanceCount = 0;

/**
 * Renders product cards into the track element.
 * @param {object[]} productViews
 * @param {HTMLElement} track
 * @param {{ showAddToCart: boolean, context: object }} opts
 */
async function renderCards(productViews, track, { showAddToCart, context }) {
  await Promise.all(productViews.map(async (product) => {
    const host = document.createElement('div');
    // useDummyData: false — prevents normalize-product.js from injecting fake badges
    // (New + Best Seller) on every card; only real badges from the API are shown.
    const card = await renderProductCard(host, {
      product, options: { showAddToCart, useDummyData: false }, context,
    });
    if (card) {
      card.setAttribute('role', 'listitem');
      track.append(card);
    }
  }));
}

/**
 * Wires up carousel behavior: prev/next arrows (scroll by one card),
 * pagination dots, and syncing of active state on scroll.
 * Arrow/dot DOM construction and active-state management are delegated to
 * createCarouselControls; this function owns the scroll engine and AbortSignal cleanup.
 * @param {HTMLElement} container - the product-collection-container
 * @param {HTMLElement} viewport - the scrollable viewport
 * @param {HTMLElement} track - the flex track holding the cards
 * @param {AbortSignal} [signal] - optional; aborts scroll/resize listeners on tab switch
 */
function buildCarousel(container, viewport, track, signal) {
  const cards = [...track.children];
  if (cards.length <= 2) return;

  // Used by CSS to show/hide arrows (desktop: >3) and dots (mobile: >2, tablet: >4)
  container.dataset.count = String(cards.length);

  const step = () => {
    const gap = parseFloat(getComputedStyle(track).columnGap) || 0;
    return cards[0].getBoundingClientRect().width + gap;
  };

  const {
    prev, next, dotsNav, setActive, setArrowsDisabled,
  } = createCarouselControls({
    prefix: 'product-collection',
    count: cards.length,
    itemNoun: 'product',
    prevLabel: 'Previous products',
    nextLabel: 'Next products',
    onPrev: () => viewport.scrollBy({ left: -step(), behavior: 'smooth' }),
    onNext: () => viewport.scrollBy({ left: step(), behavior: 'smooth' }),
    onSelect: (i) => cards[i].scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' }),
  });

  viewport.before(prev);
  viewport.after(next);
  container.append(dotsNav);

  const update = () => {
    const max = viewport.scrollWidth - viewport.clientWidth;
    setArrowsDisabled(viewport.scrollLeft <= 1, viewport.scrollLeft >= max - 1);
    setActive(Math.round(viewport.scrollLeft / step()));
  };

  // signal lets the caller (renderTab) abort these when switching tabs
  viewport.addEventListener('scroll', () => {
    window.requestAnimationFrame(update);
  }, { passive: true, signal });
  window.addEventListener('resize', update, { signal });

  // Defer initial update until the viewport has a real width.
  // The block's section may still be display:none when buildCarousel runs
  // (lazy-phase loading), so scrollWidth is 0 at call time.
  const ro = new ResizeObserver(() => {
    if (viewport.clientWidth > 0) {
      ro.disconnect();
      update();
    }
  });
  ro.observe(viewport);
  signal?.addEventListener('abort', () => ro.disconnect(), { once: true });
}

/**
 * Parses all block rows into categories and config before the block DOM is cleared.
 *
 * categoryPath rows (3 cells): key | label | path  → pushed to categories[]
 * categoryPath rows (2 cells): key | path           → single-category shorthand
 * All other rows:              key | value          → stored in config{}
 *
 * DA outputs fixed-width tables: config rows keep an empty second cell, so
 * when cell[1] is empty the value is read from cell[2].
 *
 * Legacy: a 2-cell `categoryId | path` row maps to a single category
 * for backward compatibility with pages authored in the old format.
 *
 * @param {Element} block
 * @returns {{ categories: {label: string, id: string}[], config: Record<string, string> }}
 */
function parseBlock(block) {
  const categories = [];
  const config = {};
  let heading = null;

  [...block.querySelectorAll(':scope > div')].forEach((row) => {
    const cells = [...row.querySelectorAll(':scope > div')];

    // Block-level heading — a single-cell row whose content is a heading element.
    // Authored inside the block (vs. as a section heading above it).
    if (cells.length < 2) {
      if (!heading) heading = cells[0]?.querySelector('h1, h2, h3, h4, h5, h6') || null;
      return;
    }

    const key = cells[0].textContent.trim().toLowerCase().replace(/\s/g, '');

    if (key === 'categorypath') {
      if (cells.length >= 3) {
        const label = cells[1].textContent.trim();
        const id = cells[2].textContent.trim();
        let href = '';
        let fragment = '';
        if (cells.length >= 5) {
          // Multi-tab: label | path | CTA href | fragment URL
          href = cells[3].querySelector('a')?.getAttribute('href') || cells[3].textContent.trim();
          fragment = cells[4].textContent.trim();
        } else if (cells.length === 4) {
          // 4th cell is a fragment URL (absolute) or a CTA href (relative)
          const val = cells[3].textContent.trim();
          if (val.startsWith('http')) {
            fragment = val;
          } else {
            href = val;
          }
        }
        if (id) {
          categories.push({
            label, id, href, fragment,
          });
        }
      } else {
        // Shorthand: categoryPath | category-path-value (no tab label)
        const id = cells[1].textContent.trim();
        if (id) {
          categories.push({
            label: '', id, href: '', fragment: '',
          });
        }
      }
    } else {
      // Config row — when cell[1] is empty (DA 3-column merged style), read cell[2]
      const value = (cells.length >= 3 && !cells[1].textContent.trim())
        ? cells[2].textContent.trim()
        : (cells[1]?.textContent.trim() || '');
      config[key] = value;
    }
  });

  // Legacy: single categoryId row (old block format — no tab label)
  if (!categories.length && config.categoryid) {
    categories.push({ label: '', id: config.categoryid, href: '' });
  }

  return { categories, config, heading };
}

/**
 * Fetches products for a given category path via the storefront-product-discovery dropin.
 * @param {string} categoryPath
 * @param {{ maxItems: number, sortAttribute: string, sortDir: string }} opts
 * @returns {Promise<object[]>} Normalized product objects
 */
async function fetchProducts(categoryPath, { maxItems, sortAttribute, sortDir }) {
  if (!categoryPath) return [];
  const result = await search({
    phrase: '',
    pageSize: maxItems,
    currentPage: 1,
    filter: [
      { attribute: 'categoryPath', eq: categoryPath },
      { attribute: 'visibility', in: ['Search', 'Catalog, Search'] },
    ],
    sort: [{ attribute: sortAttribute, direction: sortDir }],
  });
  return (result?.items ?? []).slice(0, maxItems);
}

/**
 * Builds the tab bar element for multi-category mode.
 * @param {{ label: string, id: string }[]} categories
 * @param {number} blockId - unique per-instance ID used to generate stable ARIA IDs
 * @returns {HTMLElement}
 */
function buildTabBar(categories, blockId) {
  const tabList = document.createElement('div');
  tabList.className = 'product-collection-tabs';
  tabList.setAttribute('role', 'tablist');

  categories.forEach(({ label }, index) => {
    const tab = document.createElement('button');
    tab.type = 'button';
    tab.id = `pc-tab-${blockId}-${index}`;
    tab.className = 'product-collection-tab';
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-selected', index === 0 ? 'true' : 'false');
    tab.setAttribute('aria-controls', `pc-panel-${blockId}`);
    tab.textContent = label;
    if (index === 0) tab.classList.add('is-active');
    tabList.append(tab);
  });

  return tabList;
}

/**
 * Creates the shared carousel DOM structure (container → viewportWrapper → viewport → track).
 * @returns {{ container: HTMLElement, viewport: HTMLElement, track: HTMLElement }}
 */
function buildCarouselDom() {
  const container = document.createElement('div');
  container.className = 'product-collection-container';

  const viewport = document.createElement('div');
  viewport.className = 'product-collection-viewport';

  const track = document.createElement('div');
  track.className = 'product-collection-track';
  track.setAttribute('role', 'list');
  viewport.append(track);

  const viewportWrapper = document.createElement('div');
  viewportWrapper.className = 'product-collection-viewport-wrapper';
  viewportWrapper.append(viewport);
  container.append(viewportWrapper);

  return { container, viewport, track };
}

function buildCtaLink({ label, href }) {
  const link = document.createElement('a');
  link.href = href;
  link.className = 'button secondary';
  link.textContent = `Shop ${label}`;
  return link;
}

/**
 * Fills the track with shimmer placeholder cards while products load.
 * @param {HTMLElement} track
 * @param {number} count number of placeholder cards
 */
function showSkeleton(track, count) {
  track.textContent = '';
  track.setAttribute('aria-busy', 'true');
  for (let i = 0; i < count; i += 1) {
    const card = document.createElement('div');
    card.className = 'product-collection-skeleton';
    card.setAttribute('aria-hidden', 'true');
    const media = document.createElement('div');
    media.className = 'product-collection-skeleton-media skeleton';
    const line1 = document.createElement('div');
    line1.className = 'product-collection-skeleton-line skeleton';
    const line2 = document.createElement('div');
    line2.className = 'product-collection-skeleton-line product-collection-skeleton-line--short skeleton';
    card.append(media, line1, line2);
    track.append(card);
  }
}

/**
 * Replaces track content with an empty-state message when a tab has no products.
 * @param {HTMLElement} track
 * @param {string} message
 */
function showEmptyState(track, message) {
  track.textContent = '';
  track.removeAttribute('aria-busy');
  const empty = document.createElement('p');
  empty.className = 'product-collection-empty';
  empty.setAttribute('role', 'status');
  empty.textContent = message;
  track.append(empty);
}

async function buildFragmentPanel(url) {
  if (!url) return null;
  // loadFragment expects a root-relative path without locale prefix.
  // Authored URLs from DA table cells are absolute (https://…/en/fragments/x),
  // so extract pathname then strip the locale root to avoid double-prefixing.
  let path = url;
  if (path.startsWith('http')) {
    try { path = new URL(path).pathname; } catch { return null; }
  }
  const root = (getRootPath() ?? '').replace(/\/$/, '');
  if (root && path.startsWith(`${root}/`)) path = path.slice(root.length);
  const frag = await loadFragment(path);
  if (!frag) return null;
  const sections = [...frag.querySelectorAll(':scope > .section')];
  if (!sections.length) return null;
  const panel = document.createElement('div');
  panel.className = 'product-collection-fragment';
  panel.append(...sections);
  return panel;
}

export default async function decorate(block) {
  const section = block.closest('.section');
  section?.classList.add('product-collection-section');

  // Capture rows before parseBlock and textContent='' wipe the DOM
  const rows = [...block.querySelectorAll(':scope > div')];
  const { illustrations } = extractIllustrations(rows, { threeColumn: true });
  const { categories, config, heading: blockHeading } = parseBlock(block);

  // Heading resolution: prefer one authored inside the block; otherwise fall
  // back to a section heading authored above the block in .default-content-wrapper.
  const sectionHeading = section?.querySelector('.default-content-wrapper > :is(h1,h2,h3,h4)');
  const heading = blockHeading || sectionHeading || null;

  // Optional heading alignment — "center" centers the heading; anything else
  // (or unset) leaves the block's default alignment.
  if (heading && config.headingalign?.toLowerCase() === 'center') {
    heading.classList.add('product-collection-heading-center');
  }

  // Optional authored background color — accepts any valid CSS color (hex like
  // "#f6f3ec" or a named color like "cornsilk"). Applied to the section so it
  // spans full width, matching the preset -surface variants. CSS.supports
  // rejects anything that isn't a valid color, so this can't inject other rules.
  const bgColor = config.bgcolor;
  if (section && bgColor && CSS.supports('background-color', bgColor)) {
    section.style.backgroundColor = bgColor;
  }

  const parsedMaxItems = Number(config.maxitems);
  const maxItems = parsedMaxItems > 0 ? parsedMaxItems : DEFAULT_MAX_ITEMS;
  const showAddToCart = config.showaddtocart?.toLowerCase() !== 'false';
  const fetchOpts = {
    maxItems,
    sortAttribute: config.sortby || 'position',
    sortDir: config.sortdirection?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC',
  };

  block.textContent = '';

  // Remove the block (and its section styling) when there's nothing to render.
  const removeEmpty = () => {
    section?.classList.remove('product-collection-section');
    block.remove();
  };

  if (!categories.length) {
    removeEmpty();
    return;
  }

  if (categories.length === 1) {
    // ─── Single category ────────────────────────────────────────────────────
    // Render a block-authored heading above the carousel. A section heading
    // (in .default-content-wrapper) is already positioned by CSS, so only move
    // a block-authored one into the block.
    if (blockHeading) block.append(blockHeading);

    const { container, viewport, track } = buildCarouselDom();
    block.append(container);
    // Shimmer placeholders while the single category loads.
    showSkeleton(track, maxItems);

    let productViews = [];
    try {
      productViews = await fetchProducts(categories[0].id, fetchOpts);
    } catch (e) {
      console.error('product-collection: product search failed', e);
      removeEmpty();
      return;
    }

    if (!productViews.length) {
      removeEmpty();
      return;
    }

    const context = await prepareProductCardContext();
    track.textContent = '';
    track.removeAttribute('aria-busy');
    await renderCards(productViews, track, { showAddToCart, context });
    buildCarousel(container, viewport, track);

    if (categories[0].fragment) {
      const panel = await buildFragmentPanel(categories[0].fragment);
      if (panel) {
        block.prepend(panel);
        block.classList.add('has-fragment');
      }
    }
  } else {
    // ─── Multi-tab ──────────────────────────────────────────────────────────
    block.classList.add('has-tabs');

    instanceCount += 1;
    const blockId = instanceCount;

    // Move the resolved heading (block-authored, else the section heading in
    // .default-content-wrapper) into the block header so it sits inline with
    // the tab bar on desktop.
    const header = document.createElement('div');
    header.className = 'product-collection-header';
    if (heading) {
      const dcw = heading.parentElement;
      header.append(heading);
      // Hide the wrapper once empty so it doesn't create a phantom gap above the block
      if (dcw?.classList.contains('default-content-wrapper') && !dcw.children.length) {
        dcw.hidden = true;
      }
    }

    const tabBar = buildTabBar(categories, blockId);
    header.append(tabBar);
    block.append(header);

    const { container, viewport, track } = buildCarouselDom();
    // ARIA tabpanel — aria-labelledby is updated to the active tab on each switch
    container.id = `pc-panel-${blockId}`;
    container.setAttribute('role', 'tabpanel');
    container.setAttribute('aria-labelledby', `pc-tab-${blockId}-0`);
    block.append(container);

    const ctaWrap = document.createElement('div');
    ctaWrap.className = 'product-collection-cta';
    block.append(ctaWrap);

    const context = await prepareProductCardContext();
    let activeIndex = 0;
    let carouselAbort = null;
    let activeFragmentUrl = null;
    let fragmentPanel = null;

    const renderTab = async (index) => {
      const {
        id, label, href, fragment,
      } = categories[index];
      const tabs = [...tabBar.querySelectorAll('.product-collection-tab')];
      tabs.forEach((tab, i) => {
        tab.classList.toggle('is-active', i === index);
        tab.setAttribute('aria-selected', i === index ? 'true' : 'false');
      });

      // Abort previous tab's scroll/resize listeners before rebuilding the carousel
      carouselAbort?.abort();
      const abort = new AbortController();
      carouselAbort = abort;

      // Clear arrows/dots and show shimmer placeholders while this tab loads,
      // so a slow response never leaves the panel blank.
      container.querySelectorAll('.product-collection-arrow, .product-collection-dots').forEach((el) => el.remove());
      delete container.dataset.count;
      showSkeleton(track, maxItems);

      // Reload fragment panel only when the URL changes between tabs
      if (fragment !== activeFragmentUrl) {
        activeFragmentUrl = fragment;
        fragmentPanel?.remove();
        fragmentPanel = null;
        if (fragment) {
          fragmentPanel = await buildFragmentPanel(fragment);
          if (abort.signal.aborted) return;
          if (fragmentPanel) {
            block.prepend(fragmentPanel);
            block.classList.add('has-fragment');
          }
        } else {
          block.classList.remove('has-fragment');
        }
      }

      let productViews = [];
      try {
        productViews = await fetchProducts(id, fetchOpts);
      } catch (e) {
        console.error('product-collection: product search failed for tab', index, e);
        if (!abort.signal.aborted) showEmptyState(track, PRODUCTS_LOAD_ERROR);
        return;
      }

      // Guard against a slower previous fetch resolving after a newer tab was clicked
      if (abort.signal.aborted) return;

      container.setAttribute('aria-labelledby', `pc-tab-${blockId}-${index}`);
      ctaWrap.textContent = '';

      // No products for this category — show a message instead of an empty carousel.
      if (!productViews.length) {
        showEmptyState(track, NO_PRODUCTS_MESSAGE);
        return;
      }

      // Clear skeletons, then render the real cards.
      track.textContent = '';
      track.removeAttribute('aria-busy');
      await renderCards(productViews, track, { showAddToCart, context });
      buildCarousel(container, viewport, track, abort.signal);
      if (href) ctaWrap.append(buildCtaLink({ label, href }));
    };

    // Wire tab click events — guard against re-clicking the active tab
    [...tabBar.querySelectorAll('.product-collection-tab')].forEach((tab, i) => {
      tab.addEventListener('click', () => {
        if (activeIndex === i) return;
        activeIndex = i;
        renderTab(i);
      });
    });

    await renderTab(0);
  }

  // Decorative wave appended to section so it spans full width across all variants.
  // White fill so the wave bites into the colored section and transitions to the white
  // page below. On by default; authors disable it via the "No Wave" block variant
  // (no-wave class) or a `wave: off` config row (also accepts false/no/none).
  // Illustrations ride on the wave when authored.
  const waveOff = block.classList.contains('no-wave')
    || ['off', 'false', 'no', 'none'].includes(config.wave?.toLowerCase());
  if (!waveOff) {
    // Curve direction is authorable via a `waveCurve` config row
    // (peak-left | peak-right); defaults to peak-right.
    const curve = config.wavecurve?.toLowerCase() === 'peak-left' ? 'peak-left' : 'peak-right';
    decorateWave(section || block, {
      position: 'bottom', curve, color: 'var(--color-neutral-50)', illustrations,
    });
  }
}
