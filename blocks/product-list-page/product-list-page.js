// Product Discovery Dropins
import SearchResults from '@dropins/storefront-product-discovery/containers/SearchResults.js';
import Facets from '@dropins/storefront-product-discovery/containers/Facets.js';
import SortBy from '@dropins/storefront-product-discovery/containers/SortBy.js';
import { render as provider } from '@dropins/storefront-product-discovery/render.js';
import { search } from '@dropins/storefront-product-discovery/api.js';
// Event Bus
import { events } from '@dropins/tools/event-bus.js';
// AEM
import { readBlockConfig } from '../../scripts/aem.js';
import { fetchPlaceholders, getProductLink } from '../../scripts/commerce.js';
import { getCategoryPath } from '../../scripts/utils.js';
import { renderProductCard } from '../../scripts/components/commerce-product-card/commerce-product-card.js';
import { getSearchStateFromUrl, applySearchStateToUrl } from './search-url.js';

// Legacy dropin tile imports (commented out — GS card handles image/actions/wishlist)
// import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
// import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
// import * as cartApi from '@dropins/storefront-cart/api.js';
// import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';

// Initializers
import '../../scripts/initializers/search.js';
import '../../scripts/initializers/wishlist.js';

const PLP_LOAD_MORE_SCOPE = 'plp-load-more';
const PLP_MOBILE_BATCH_SIZE = 6;
const PLP_DESKTOP_BATCH_SIZE = 15;

// System filters always applied to the request — excluded from the visible filter count
const SYSTEM_FILTER_ATTRIBUTES = new Set(['visibility', 'categoryPath']);

// Dropin default option cap per facet (buckets beyond this sit behind a "show more" button)
const PLP_FACET_OPTION_LIMIT = 5;

/** @returns {number} Products per batch — 6 mobile, 15 desktop (Figma 5168:202110) */
function getLoadMoreBatchSize() {
  return window.matchMedia('(min-width: 768px)').matches
    ? PLP_DESKTOP_BATCH_SIZE
    : PLP_MOBILE_BATCH_SIZE;
}

export default async function decorate(block) {
  const labels = await fetchPlaceholders();

  const cardOptions = {
    placeholders: labels,
    useDummyData: false,
    layout: 'plp',
  };

  const config = readBlockConfig(block);
  // Prefer the authored urlPath cell (exact category, e.g. "new"); fall back to
  // deriving it from the URL. Using the authored value avoids leaking locale/
  // folder segments (e.g. "en/new") into the categoryPath filter.
  const urlpath = config.urlpath || getCategoryPath();
  const batchSize = getLoadMoreBatchSize();

  // Facet drawer labels (Figma 5830:197203 tablet / 7424:343484 mobile)
  const filterByLabel = labels.Search?.PLP?.FilterBy || labels.Global?.Filters || 'Filter by';
  const closeFacetsLabel = labels.Global?.Close || 'Close filters';
  const applyFacetsLabel = labels.Search?.PLP?.ViewResults || labels.Global?.ViewResults || 'View results';
  const selectedFiltersLabel = labels.Search?.PLP?.SelectedFilters
    || labels.Global?.SelectedFilters || 'Selected filters';

  // Localized "Selected filters" heading — rendered via CSS ::before (survives dropin re-renders)
  block.style.setProperty('--plp-selected-filters-label', JSON.stringify(selectedFiltersLabel));

  const fragment = document.createRange()
    .createContextualFragment(`
    <div class="search__wrapper">
      <div class="search__view-facets">
        <button type="button" class="search__view-facets-btn">
          <svg class="search__view-facets-icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M4 7h16M6 12h12M9 17h6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
          <span class="search__view-facets-label">${filterByLabel}</span>
        </button>
      </div>
      <div class="search__facets-drawer" data-open="false">
        <div class="search__facets-overlay" data-dismiss="drawer"></div>
        <aside class="search__facets-panel" role="dialog" aria-modal="true" aria-label="${filterByLabel}">
          <div class="search__facets-header">
            <span class="search__facets-title">${filterByLabel}</span>
            <button type="button" class="search__facets-close" aria-label="${closeFacetsLabel}" data-dismiss="drawer">
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>
            </button>
          </div>
          <div class="search__facets"></div>
          <div class="search__facets-footer">
            <button type="button" class="button primary search__facets-apply">${applyFacetsLabel}</button>
          </div>
        </aside>
      </div>
      <div class="search__main">
        <div class="search__toolbar">
          <div class="search__result-info"></div>
          <div class="search__product-sort"></div>
        </div>
        <div class="search__product-list"></div>
        <div class="search__load-more" hidden></div>
      </div>
    </div>
  `);

  const $resultInfo = fragment.querySelector('.search__result-info');
  const $viewFacets = fragment.querySelector('.search__view-facets');
  const $facetsDrawer = fragment.querySelector('.search__facets-drawer');
  const $facets = fragment.querySelector('.search__facets');
  const $productSort = fragment.querySelector('.search__product-sort');
  const $productList = fragment.querySelector('.search__product-list');
  const $loadMore = fragment.querySelector('.search__load-more');

  let lastSearchRequest = null;
  let totalCount = 0;
  let currentPage = 1;
  let isLoadingMore = false;

  block.innerHTML = '';
  block.appendChild(fragment);

  // Facet drawer (mobile/tablet) — desktop shows a persistent sidebar instead
  const desktopMq = window.matchMedia('(min-width: 1100px)');
  const openFacetsDrawer = () => {
    if (desktopMq.matches) return;
    $facetsDrawer.dataset.open = 'true';
    document.body.style.overflow = 'hidden';
    $facetsDrawer.querySelector('.search__facets-close')?.focus();
  };
  const closeFacetsDrawer = () => {
    if ($facetsDrawer.dataset.open !== 'true') return;
    $facetsDrawer.dataset.open = 'false';
    document.body.style.overflow = '';
    $viewFacets.querySelector('button')?.focus();
  };
  $facetsDrawer.addEventListener('click', (event) => {
    if (event.target.closest('[data-dismiss="drawer"]')) closeFacetsDrawer();
  });
  $viewFacets.querySelector('.search__view-facets-btn')
    ?.addEventListener('click', openFacetsDrawer);
  $facetsDrawer.querySelector('.search__facets-apply')
    ?.addEventListener('click', closeFacetsDrawer);
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeFacetsDrawer();
  });
  // Reset drawer state when crossing into the desktop sidebar layout
  desktopMq.addEventListener('change', (event) => {
    if (event.matches) closeFacetsDrawer();
  });

  // Add url path back to the block for enrichment, incase enrichment block is
  // executed after the plp block and block config is not available
  if (urlpath) {
    block.dataset.urlpath = urlpath;
  }

  const searchState = getSearchStateFromUrl(new URL(window.location.href));

  // Default visibility filter for all of our requests
  const visibilityFilter = { attribute: 'visibility', in: ['Search', 'Catalog, Search'] };
  const userFilters = searchState.filter.filter((f) => f.attribute !== 'visibility');

  // Normalize URL (e.g. pipe-separated filter values)
  const normalizedUrl = new URL(window.location.href);
  applySearchStateToUrl(normalizedUrl, searchState);
  window.history.replaceState({}, '', normalizedUrl.toString());

  // Request search based on the page type on block load
  if (urlpath) {
    // If it's a category page...
    await search({
      phrase: '', // search all products in the category
      currentPage: searchState.currentPage > 1 ? 1 : searchState.currentPage,
      pageSize: batchSize,
      sort: searchState?.sort?.length ? searchState.sort : [{ attribute: 'position', direction: 'DESC' }],
      filter: [
        { attribute: 'categoryPath', eq: urlpath }, // Add category filter
        // Always add visibility filter to the request
        visibilityFilter,
        ...userFilters,
      ],
    }).catch(() => {
      console.error('Error searching for products');
    });
  } else {
    // Search page: dropin uses only the request (no URL parsing).
    await search({
      phrase: searchState.phrase,
      currentPage: searchState.currentPage > 1 ? 1 : searchState.currentPage,
      pageSize: batchSize,
      sort: searchState.sort,
      // Always add visibility filter to the request
      filter: [visibilityFilter, ...userFilters],
    }).catch((e) => {
      console.error('Error searching for products', e);
    });
  }

  // Legacy dropin add-to-cart helper (commented out — commerce-product-card handles ATC)
  /*
  const getAddToCartButton = (product) => {
    if (product.typename === 'ComplexProductView') {
      const button = document.createElement('div');
      UI.render(Button, {
        children: labels.Global?.AddProductToCart,
        icon: Icon({ source: 'Cart' }),
        href: getProductLink(product.urlKey, product.sku),
        variant: 'primary',
      })(button);
      return button;
    }
    const button = document.createElement('div');
    UI.render(Button, {
      children: labels.Global?.AddProductToCart,
      icon: Icon({ source: 'Cart' }),
      onClick: () => cartApi.addProductsToCart([{
        sku: product.sku,
        quantity: 1,
      }]),
      variant: 'primary',
      disabled: !product.inStock,
    })(button);
    return button;
  };
  */

  const clearOrphanedCardHosts = () => {
    $productList.querySelectorAll('.product-list-page__card-host').forEach((host) => {
      host.remove();
    });
  };

  // GS cards use replaceWith on dropin tiles — clear orphans before sort/filter/page updates
  events.on('search/loading', (loading) => {
    if (loading) {
      // Hold the current height while results reload so the page doesn't collapse then
      // expand (layout shift) on every filter/sort change.
      const currentHeight = $productList.offsetHeight;
      if (currentHeight) {
        $productList.style.minHeight = `${currentHeight}px`;
      }
      clearOrphanedCardHosts();
    }
  }, { eager: true });

  const getDisplayedProductCount = () => (
    $productList.querySelectorAll('.product-list-page__card-host').length
  );

  const updateLoadMoreButton = () => {
    const displayed = getDisplayedProductCount();
    const hasMore = totalCount > 0 && displayed < totalCount;
    $loadMore.hidden = !hasMore;
  };

  const appendProductsToGrid = async (products = []) => {
    const grid = $productList.querySelector('.product-discovery-product-list__grid');
    if (!grid || products.length === 0) return;

    const existingSkus = new Set(
      [...grid.querySelectorAll('.product-list-page__card-host[data-sku]')]
        .map((host) => host.dataset.sku),
    );

    await Promise.all(products.map(async (product) => {
      if (!product?.sku || existingSkus.has(product.sku)) return;
      existingSkus.add(product.sku);

      const host = document.createElement('div');
      host.className = 'product-list-page__card-host';
      host.dataset.sku = product.sku;
      grid.append(host);

      try {
        await renderProductCard(host, {
          product,
          options: cardOptions,
        });
      } catch (error) {
        console.warn('Product card render failed for SKU', product.sku, error);
      }
    }));
  };

  const loadMoreLabel = labels.ProductList?.LoadMore
    || labels.Search?.PLP?.LoadMore
    || 'Load more…';

  const loadMoreBtn = document.createElement('button');
  loadMoreBtn.type = 'button';
  loadMoreBtn.className = 'button secondary';
  loadMoreBtn.textContent = loadMoreLabel;
  loadMoreBtn.addEventListener('click', async () => {
    if (!lastSearchRequest || isLoadingMore) return;

    const displayed = getDisplayedProductCount();
    if (displayed >= totalCount) return;

    isLoadingMore = true;
    loadMoreBtn.disabled = true;

    const nextPage = currentPage + 1;

    try {
      await search({
        ...lastSearchRequest,
        currentPage: nextPage,
        pageSize: getLoadMoreBatchSize(),
      }, { scope: PLP_LOAD_MORE_SCOPE });
    } catch (error) {
      console.error('Error loading more products', error);
    } finally {
      isLoadingMore = false;
      loadMoreBtn.disabled = false;
    }
  });
  $loadMore.append(loadMoreBtn);

  // Append-only fetch — scoped so SearchResults grid is not replaced
  events.on('search/result', async (payload) => {
    currentPage = payload.request?.currentPage || currentPage;
    await appendProductsToGrid(payload.result?.items || []);
    updateLoadMoreButton();
  }, { scope: PLP_LOAD_MORE_SCOPE });

  await Promise.all([
    // Sort By
    provider.render(SortBy, {})($productSort),

    // Facets
    provider.render(Facets, {})($facets),
    // Product List
    provider.render(SearchResults, {
      routeProduct: (product) => getProductLink(product.urlKey, product.sku),
      slots: {
        // GS commerce-product-card — replaces entire dropin product tile
        ProductImage: async (ctx, element) => {
          if (element?.closest('.product-list-page__card-host')) return;

          const dropinCard = element?.closest('.dropin-product-item-card');
          if (!dropinCard) return;

          const host = document.createElement('div');
          host.className = 'product-list-page__card-host';
          if (ctx.product?.sku) {
            host.dataset.sku = ctx.product.sku;
          }
          dropinCard.replaceWith(host);

          try {
            await renderProductCard(host, {
              product: ctx.product,
              options: cardOptions,
            });
            updateLoadMoreButton();
          } catch (error) {
            console.warn('Product card render failed for SKU', ctx.product?.sku, error);
          }
        },
        ProductName: (ctx) => {
          ctx.remove();
        },
        ProductPrice: (ctx) => {
          ctx.remove();
        },
        ProductActions: (ctx) => {
          ctx.remove();
        },

        // Legacy dropin tile slots (commented out — see commerce-product-card above)
        /*
        ProductImage: (ctx) => {
          const {
            product,
            defaultImageProps,
          } = ctx;
          const anchorWrapper = document.createElement('a');
          anchorWrapper.href = getProductLink(product.urlKey, product.sku);

          tryRenderAemAssetsImage(ctx, {
            alias: product.sku,
            imageProps: defaultImageProps,
            wrapper: anchorWrapper,
            params: {
              width: defaultImageProps.width,
              height: defaultImageProps.height,
            },
          });
        },
        ProductActions: async (ctx) => {
          const actionsWrapper = document.createElement('div');
          actionsWrapper.className = 'product-discovery-product-actions';
          const addToCartBtn = getAddToCartButton(ctx.product);
          addToCartBtn.className = 'product-discovery-product-actions__add-to-cart';
          const $wishlistToggle = document.createElement('div');
          $wishlistToggle.classList.add('product-discovery-product-actions__wishlist-toggle');
          wishlistRender.render(WishlistToggle, {
            product: ctx.product,
            variant: 'tertiary',
          })($wishlistToggle);
          actionsWrapper.appendChild(addToCartBtn);
          actionsWrapper.appendChild($wishlistToggle);

          try {
            const { initializeRequisitionList } = await import('./requisition-list.js');

            const $reqListContainer = await initializeRequisitionList({
              product: ctx.product,
              labels,
            });

            actionsWrapper.appendChild($reqListContainer);
          } catch (error) {
            console.warn('Requisition list module not available:', error);
          }

          ctx.replaceWith(actionsWrapper);
        },
        */
      },
    })($productList),
  ]);

  // ===== Facet accordion + expand-all =====
  // The product-discovery dropin has no collapse UI and caps each facet at 5 options
  // (behind a show-more button). We expand every facet so all options render, and add a
  // chevron accordion. Collapse state is keyed by facet title so it survives dropin
  // re-renders (which rebuild the facet DOM on each search).
  const collapsedFacets = new Set();
  const facetDefaultsApplied = new Set();
  // Colour name → hex, populated from the search result when the backend sends type: COLOR_HEX
  const colorSwatchHexMap = new Map();
  let facetEnhanceScheduled = false;

  const enhanceFacets = () => {
    const isDesktop = desktopMq.matches;
    $facets.querySelectorAll('.product-discovery-facet').forEach((facet, index) => {
      const header = facet.querySelector('.product-discovery-facet__header');
      if (!header) return;
      const key = header.textContent.trim();

      // Expand all options — click the hidden dropin "show more" so nothing stays truncated
      const bucketCount = facet.querySelectorAll('.product-discovery-facet__bucket').length;
      const moreBtn = facet.querySelector(':scope > .dropin-button');
      if (moreBtn && bucketCount <= PLP_FACET_OPTION_LIMIT) {
        moreBtn.click();
      }

      // Color facet → render options as swatches (colour comes from the option value)
      const isColorFacet = key.toLowerCase() === 'color';
      facet.classList.toggle('is-color-facet', isColorFacet);
      if (isColorFacet) {
        facet.querySelectorAll('.dropin-checkbox').forEach((checkbox) => {
          const input = checkbox.querySelector('input');
          const box = checkbox.querySelector('.dropin-checkbox__box');
          const value = (input?.value || '').trim();
          if (!box || !value) return;
          // Prefer a backend hex (bucket type COLOR_HEX); else the colour name if it's a valid
          // CSS colour; otherwise leave it to the CSS neutral fallback.
          const hex = colorSwatchHexMap.get(value);
          if (hex) {
            box.style.setProperty('--swatch-color', hex);
          } else if (window.CSS?.supports?.('color', value)) {
            box.style.setProperty('--swatch-color', value);
          } else {
            box.style.removeProperty('--swatch-color');
          }
        });
      }

      // Split each option label into name + count spans (styled separately / stacked for swatches).
      // Rebuild only when the label isn't already exactly our two spans, so a dropin re-render
      // can't leave a duplicate count text node next to them.
      facet.querySelectorAll('.product-discovery-facet__bucket [data-slot="FacetBucketLabel"]').forEach((labelEl) => {
        const existingName = labelEl.querySelector('.plp-facet-bucket__name');
        const existingCount = labelEl.querySelector('.plp-facet-bucket__count');
        let name;
        let count;
        if (existingName) {
          // Read from our own spans so values never compound across passes
          name = existingName.textContent;
          count = existingCount ? existingCount.textContent : '';
        } else {
          const text = labelEl.textContent.trim();
          const match = text.match(/^(.*?)\s*(\([\d,]+\))?$/);
          name = (match && match[1]) || text;
          count = (match && match[2]) || '';
        }
        const expectedChildren = count ? 2 : 1;
        if (labelEl.childNodes.length === expectedChildren && labelEl.firstChild === existingName) {
          return; // already clean — leave it
        }
        const nodes = [];
        const nameSpan = document.createElement('span');
        nameSpan.className = 'plp-facet-bucket__name';
        nameSpan.textContent = name;
        nodes.push(nameSpan);
        if (count) {
          const countSpan = document.createElement('span');
          countSpan.className = 'plp-facet-bucket__count';
          countSpan.textContent = count;
          nodes.push(countSpan);
        }
        labelEl.replaceChildren(...nodes);
      });

      // Default open state: desktop all open; mobile only the first facet open
      if (!facetDefaultsApplied.has(key)) {
        facetDefaultsApplied.add(key);
        if (!isDesktop && index > 0) collapsedFacets.add(key);
      }
      facet.classList.toggle('is-collapsed', collapsedFacets.has(key));

      // Wire the header as an accordion toggle (once per rendered header element)
      if (!header.dataset.accordion) {
        header.dataset.accordion = 'true';
        header.setAttribute('role', 'button');
        header.setAttribute('tabindex', '0');
        const toggle = () => {
          const collapsed = !collapsedFacets.has(key);
          if (collapsed) collapsedFacets.add(key);
          else collapsedFacets.delete(key);
          facet.classList.toggle('is-collapsed', collapsed);
          header.setAttribute('aria-expanded', String(!collapsed));
        };
        header.addEventListener('click', toggle);
        header.addEventListener('keydown', (event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggle();
          }
        });
      }
      header.setAttribute('aria-expanded', String(!collapsedFacets.has(key)));
    });
  };

  const scheduleFacetEnhance = () => {
    if (facetEnhanceScheduled) return;
    facetEnhanceScheduled = true;
    requestAnimationFrame(() => {
      facetEnhanceScheduled = false;
      enhanceFacets();
    });
  };

  // Re-apply on every dropin re-render (facets rebuild on each search)
  const facetObserver = new MutationObserver(scheduleFacetEnhance);
  facetObserver.observe($facets, { childList: true, subtree: true });
  scheduleFacetEnhance();

  // ===== Custom Sort dropdown (Figma menu) — drives the dropin's hidden native <select> =====
  let sortSyncScheduled = false;
  const syncSortDropdown = () => {
    const select = $productSort.querySelector('.dropin-picker__select');
    if (!select) return;

    let root = $productSort.querySelector('.plp-sort');
    if (!root) {
      root = document.createRange().createContextualFragment(`
        <div class="plp-sort">
          <button type="button" class="plp-sort__trigger" aria-haspopup="listbox" aria-expanded="false">
            <span class="plp-sort__value"></span>
            <svg class="plp-sort__chevron" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <ul class="plp-sort__menu" role="listbox" hidden></ul>
        </div>
      `).querySelector('.plp-sort');
      const trigger = root.querySelector('.plp-sort__trigger');
      const menu = root.querySelector('.plp-sort__menu');
      const positionMenu = () => {
        const rect = trigger.getBoundingClientRect();
        menu.style.top = `${rect.bottom + 4}px`;
        const left = Math.max(8, rect.right - menu.offsetWidth);
        menu.style.left = `${left}px`;
      };
      const closeMenu = () => {
        if (menu.hidden) return;
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
        window.removeEventListener('scroll', closeMenu, true);
        window.removeEventListener('resize', closeMenu);
      };
      const openMenu = () => {
        menu.hidden = false;
        trigger.setAttribute('aria-expanded', 'true');
        positionMenu();
        window.addEventListener('scroll', closeMenu, true);
        window.addEventListener('resize', closeMenu);
        (menu.querySelector('[aria-selected="true"]') || menu.firstElementChild)?.focus();
      };
      trigger.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
      document.addEventListener('click', (event) => {
        if (!root.contains(event.target)) closeMenu();
      });
      menu.addEventListener('click', (event) => {
        const opt = event.target.closest('.plp-sort__option');
        if (!opt) return;
        select.value = opt.dataset.value;
        select.dispatchEvent(new Event('change', { bubbles: true }));
        closeMenu();
        trigger.focus();
      });
      menu.addEventListener('keydown', (event) => {
        const opts = [...menu.querySelectorAll('.plp-sort__option')];
        const i = opts.indexOf(document.activeElement);
        if (event.key === 'ArrowDown') {
          event.preventDefault();
          opts[Math.min(i + 1, opts.length - 1)]?.focus();
        } else if (event.key === 'ArrowUp') {
          event.preventDefault();
          opts[Math.max(i - 1, 0)]?.focus();
        } else if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          document.activeElement?.click();
        } else if (event.key === 'Escape') {
          closeMenu();
          trigger.focus();
        }
      });
      ($productSort.querySelector('.dropin-picker') || $productSort).append(root);
    }

    const value = root.querySelector('.plp-sort__value');
    const menu = root.querySelector('.plp-sort__menu');
    const options = [...select.options];

    // Rebuild the option list only when the set changes (avoids observer churn)
    const keys = options.map((o) => o.value).join('|');
    if (menu.dataset.keys !== keys) {
      menu.dataset.keys = keys;
      menu.replaceChildren(...options.map((o) => {
        const li = document.createElement('li');
        li.className = 'plp-sort__option';
        li.setAttribute('role', 'option');
        li.dataset.value = o.value;
        li.tabIndex = -1;
        li.textContent = o.textContent;
        return li;
      }));
    }

    // Sync the selected label + highlighted option (only if changed — no churn)
    const selected = select.selectedOptions[0];
    const label = selected ? selected.textContent : '';
    if (value.textContent !== label) value.textContent = label;
    menu.querySelectorAll('.plp-sort__option').forEach((li) => {
      const isSel = String(li.dataset.value === select.value);
      if (li.getAttribute('aria-selected') !== isSel) li.setAttribute('aria-selected', isSel);
    });
  };
  const scheduleSortSync = () => {
    if (sortSyncScheduled) return;
    sortSyncScheduled = true;
    requestAnimationFrame(() => { sortSyncScheduled = false; syncSortDropdown(); });
  };
  $productSort.addEventListener('change', scheduleSortSync);
  const sortObserver = new MutationObserver(scheduleSortSync);
  sortObserver.observe($productSort, { childList: true, subtree: true });
  scheduleSortSync();

  // Listen for search results (event is fired before the block is rendered; eager: true)
  events.on('search/result', (payload) => {
    const resultTotal = payload.result?.totalCount || 0;

    // Capture backend-provided swatch hex (bucket type COLOR_HEX), when available
    let swatchHexUpdated = false;
    (payload.result?.facets || []).forEach((facet) => {
      (facet.buckets || []).forEach((bucket) => {
        if (bucket?.type === 'COLOR_HEX' && bucket.value && bucket.title
          && colorSwatchHexMap.get(bucket.title) !== bucket.value) {
          colorSwatchHexMap.set(bucket.title, bucket.value);
          swatchHexUpdated = true;
        }
      });
    });
    if (swatchHexUpdated) scheduleFacetEnhance();

    block.classList.toggle('product-list-page--empty', resultTotal === 0);

    lastSearchRequest = payload.request;
    totalCount = resultTotal;
    currentPage = payload.request?.currentPage || 1;

    // Results Info
    $resultInfo.replaceChildren();
    if (payload.request?.phrase) {
      $resultInfo.append(document.createTextNode(`${resultTotal} results found for `));
      const strong = document.createElement('strong');
      strong.textContent = `"${payload.request.phrase}"`;
      $resultInfo.append(strong, document.createTextNode('.'));
    } else {
      $resultInfo.textContent = `${resultTotal} results found.`;
    }

    // Update the view facets button with the number of user-selected filters
    // (exclude system filters that are always present: visibility + categoryPath)
    const userFilterCount = (payload.request.filter || [])
      .filter((f) => !SYSTEM_FILTER_ATTRIBUTES.has(f.attribute)).length;
    const $viewFacetsBtn = $viewFacets.querySelector('button');
    if (userFilterCount > 0) {
      $viewFacetsBtn.setAttribute('data-count', userFilterCount);
    } else {
      $viewFacetsBtn.removeAttribute('data-count');
    }

    requestAnimationFrame(() => {
      updateLoadMoreButton();
      // Release the held height once the new results have rendered
      $productList.style.minHeight = '';
    });
  }, { eager: true });

  // Listen for search results (event is fired after the block is rendered; eager: false)
  // URL is owned by this project; update it when search state changes (not load-more pages).
  events.on('search/result', (payload) => {
    const url = new URL(window.location.href);
    applySearchStateToUrl(url, {
      ...payload.request,
      currentPage: 1,
    });
    window.history.pushState({}, '', url.toString());
  }, { eager: false });
}
