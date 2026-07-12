import { Button, Icon, provider as UI } from '@dropins/tools/components.js';
import { WishlistToggle } from '@dropins/storefront-wishlist/containers/WishlistToggle.js';
import { render as wishlistRender } from '@dropins/storefront-wishlist/render.js';
import * as cartApi from '@dropins/storefront-cart/api.js';
import { loadCSS } from '../../aem.js';
import { fetchPlaceholders, getProductLink } from '../../commerce.js';
import { normalizeProductView, buildBadgeConfig } from './normalize-product.js';
import { mountProductCardMedia } from './product-card-media.js';
import { openProductCardDrawer } from './product-card-drawer.js';
import { showToast } from '../toast/toast.js';
import '../../initializers/cart.js';
import '../../initializers/wishlist.js';

let cardStylesLoaded = false;

/**
 * @typedef {object} ProductCardRenderContext
 * @property {object} placeholders
 * @property {object} badgeConfig
 * @property {boolean} useDummyData
 */

/**
 * Loads card CSS and placeholders once for list/grid rendering (PLP, sliders, recs).
 * @param {object} [options]
 * @returns {Promise<ProductCardRenderContext>}
 */
export async function prepareProductCardContext(options = {}) {
  if (!cardStylesLoaded) {
    await loadCSS(`${window.hlx.codeBasePath}/scripts/components/commerce-product-card/commerce-product-card.css`);
    cardStylesLoaded = true;
  }

  const placeholders = options.placeholders || await fetchPlaceholders();

  // Badge definitions live in their own sheet (ProductBadges.*). Built once and
  // shared across the grid; callers may pass a prebuilt badgeConfig to skip this.
  let { badgeConfig } = options;
  if (!badgeConfig) {
    const productPlaceholders = await fetchPlaceholders('placeholders/product.json').catch(() => ({}));
    badgeConfig = buildBadgeConfig(productPlaceholders);
  }

  return {
    placeholders,
    badgeConfig,
    useDummyData: options.useDummyData !== false,
  };
}

/**
 * Normalizes discovery/search product payloads for the card model.
 * @param {object} product
 * @returns {object}
 */
export function toProductViewPayload(product) {
  if (!product) return product;
  return {
    ...product,
    __typename: product.__typename || product.typename || product.itemType,
    options: product.options || [],
  };
}

/**
 * @param {number|null} rating
 * @returns {number}
 */
function clampRating(rating) {
  if (rating == null || Number.isNaN(rating)) return 0;
  return Math.max(0, Math.min(5, rating));
}

/**
 * @param {import('./normalize-product.js').ProductCardRating|null} rating
 * @returns {HTMLElement|null}
 */
function buildRatingRow(rating) {
  if (!rating?.value && !rating?.count) return null;

  const row = document.createElement('div');
  row.className = 'commerce-product-card__rating';
  if (rating.isDummy) {
    row.dataset.dummy = 'true';
  }

  const stars = document.createElement('span');
  stars.className = 'commerce-product-card__stars';
  stars.setAttribute('role', 'img');

  const value = clampRating(rating.value ?? 0);
  const label = rating.count
    ? `${value} out of 5 stars, ${rating.count} reviews`
    : `${value} out of 5 stars`;
  stars.setAttribute('aria-label', label);

  const fullStars = Math.floor(value);
  const hasHalfStar = value - fullStars >= 0.25 && value - fullStars < 0.75;

  for (let i = 1; i <= 5; i += 1) {
    const star = document.createElement('span');
    star.className = 'commerce-product-card__star';
    if (i > fullStars + (hasHalfStar ? 1 : 0)) {
      star.classList.add('commerce-product-card__star--empty');
    } else if (hasHalfStar && i === fullStars + 1) {
      star.classList.add('commerce-product-card__star--half');
    }
    stars.append(star);
  }

  row.append(stars);

  if (rating.value != null) {
    const score = document.createElement('span');
    score.className = 'commerce-product-card__rating-value';
    const formatted = Number(rating.value);
    let scoreText;
    if (Number.isNaN(formatted)) {
      scoreText = String(rating.value);
    } else if (formatted % 1 === 0) {
      scoreText = String(Math.round(formatted));
    } else {
      scoreText = formatted.toFixed(1);
    }
    score.textContent = scoreText;
    row.append(score);
  }

  if (rating.count != null) {
    const count = document.createElement('span');
    count.className = 'commerce-product-card__rating-count';
    count.textContent = `(${rating.count})`;
    row.append(count);
  }

  return row;
}

/**
 * @param {object} placeholders
 * @param {object} [options]
 * @returns {{
 *   showSku: boolean,
 *   showWholesalePriceLabel: boolean,
 *   skuLabel: string,
 *   wholesalePriceLabel: string,
 *   layout: 'default'|'plp',
 * }}
 */
function resolveCardDisplayOptions(placeholders = {}, options = {}) {
  return {
    showSku: options.showSku === true,
    showWholesalePriceLabel: options.showWholesalePriceLabel === true,
    skuLabel: placeholders?.ProductCard?.SkuLabel || 'SKU:',
    wholesalePriceLabel: placeholders?.ProductCard?.WholesalePriceLabel || 'Wholesale Price:',
    layout: options.layout === 'plp' ? 'plp' : 'default',
  };
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {{ showSku: boolean, skuLabel: string }} displayOptions
 * @returns {HTMLElement|null}
 */
function buildSkuLine(model, displayOptions) {
  if (!displayOptions.showSku || !model.sku) return null;

  const sku = document.createElement('p');
  sku.className = 'commerce-product-card__sku';
  sku.textContent = `${displayOptions.skuLabel} ${model.sku}`;
  return sku;
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {HTMLElement} titleLink
 * @param {{ showSku: boolean, skuLabel: string }} displayOptions
 * @returns {HTMLElement}
 */
function buildHeadingBlock(model, titleLink, displayOptions) {
  const skuLine = buildSkuLine(model, displayOptions);
  if (!skuLine) return titleLink;

  const heading = document.createElement('div');
  heading.className = 'commerce-product-card__heading';
  heading.append(titleLink, skuLine);
  return heading;
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {{ showWholesalePriceLabel: boolean, wholesalePriceLabel: string }} displayOptions
 * @returns {HTMLElement|null}
 */
function buildPricingBlock(model, displayOptions) {
  const priceRow = buildPriceRow(model);
  if (!priceRow && !displayOptions.showWholesalePriceLabel) return null;

  const pricing = document.createElement('div');
  pricing.className = 'commerce-product-card__pricing';

  if (displayOptions.showWholesalePriceLabel) {
    const label = document.createElement('p');
    label.className = 'commerce-product-card__price-label';
    label.textContent = displayOptions.wholesalePriceLabel;
    pricing.append(label);
  }

  if (priceRow) {
    pricing.append(priceRow);
  }

  return pricing;
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @returns {HTMLElement|null}
 */
function buildPriceRow(model) {
  if (!model.price?.formattedFinal) return null;

  const row = document.createElement('div');
  row.className = 'commerce-product-card__price-row';
  if (model.price.onSale) {
    row.classList.add('commerce-product-card__price-row--sale');
  }

  const current = document.createElement('span');
  current.className = 'commerce-product-card__price-current';
  current.textContent = model.price.formattedFinal;
  row.append(current);

  if (model.price.onSale && model.price.formattedRegular) {
    const regular = document.createElement('span');
    regular.className = 'commerce-product-card__price-regular';
    regular.textContent = model.price.formattedRegular;
    row.append(regular);
  }

  if (model.price.onSale && model.price.discountPercent) {
    const badge = document.createElement('span');
    badge.className = 'commerce-product-card__price-badge';
    badge.textContent = `${model.price.discountPercent}% Off`;
    row.append(badge);
  }

  return row;
}

const MAX_VISIBLE_SWATCHES = 6;

/**
 * @param {HTMLElement} element
 * @param {import('./normalize-product.js').ProductCardSwatch} swatch
 */
function applySwatchVisual(element, swatch) {
  if (swatch.imageUrl) {
    element.classList.add('commerce-product-card__swatch--image');
    element.style.backgroundImage = `url(${swatch.imageUrl})`;
    return;
  }

  if (swatch.color) {
    element.style.backgroundColor = swatch.color;
    return;
  }

  if (swatch.label) {
    element.classList.add('commerce-product-card__swatch--text');
    element.textContent = swatch.label.slice(0, 2).toUpperCase();
  }
}

/**
 * Display-only color preview — selection happens in the configurable drawer only.
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @returns {HTMLElement|null}
 */
function buildSwatches(model) {
  if (!model.swatches.length) return null;

  const list = document.createElement('ul');
  list.className = 'commerce-product-card__swatches';
  list.setAttribute('aria-label', 'Available colors');

  const visibleSwatches = model.swatches.slice(0, MAX_VISIBLE_SWATCHES);
  const overflowCount = model.swatches.length - visibleSwatches.length;

  visibleSwatches.forEach((swatch) => {
    const item = document.createElement('li');
    item.className = 'commerce-product-card__swatch-item';
    if (swatch.selected) {
      item.classList.add('commerce-product-card__swatch-item--selected');
    }

    const chip = document.createElement('span');
    chip.className = 'commerce-product-card__swatch';

    if (swatch.label) {
      chip.title = swatch.label;
    }

    if (!swatch.inStock) {
      chip.classList.add('commerce-product-card__swatch--unavailable');
    }

    applySwatchVisual(chip, swatch);

    item.append(chip);
    list.append(item);
  });

  if (overflowCount > 0) {
    const more = document.createElement('li');
    more.className = 'commerce-product-card__swatch-more';
    more.textContent = `+${overflowCount}`;
    more.setAttribute('aria-label', `${overflowCount} more colors`);
    list.append(more);
  }

  return list;
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {object} placeholders
 * @returns {string}
 */
function getAddToCartButtonLabel(model, placeholders) {
  if (!model.inStock) {
    return placeholders?.Global?.OutOfStock
      || placeholders?.Product?.OutOfStock
      || 'Out of Stock';
  }
  return placeholders?.Global?.AddProductToCart;
}

/**
 * @param {HTMLElement} card
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {object} placeholders
 * @param {object} options
 */
async function wireAddToCart(card, model, placeholders, options) {
  const mediaActions = card.querySelector('.commerce-product-card__media > .commerce-product-card__actions');
  const footerActions = card.querySelector('.commerce-product-card__actions--footer');
  const actions = mediaActions || card.querySelector('.commerce-product-card__actions');
  const mounts = [actions, footerActions].filter(Boolean);
  if (mounts.length === 0) return;

  const isOutOfStock = !model.inStock;
  const instances = [];

  const setButtonState = (updater) => {
    instances.forEach((instance) => {
      instance.setProps(updater);
    });
  };

  const onClick = async () => {
    if (isOutOfStock) return;

    if (model.isConfigurable) {
      await openProductCardDrawer(model, actions || footerActions, {
        placeholders,
        onAddToCart: options.onAddToCart,
      });
      return;
    }

    try {
      setButtonState((prev) => ({
        ...prev,
        children: placeholders?.Global?.AddingToCart || 'Adding…',
        disabled: true,
      }));

      const response = await cartApi.addProductsToCart([{
        sku: model.sku,
        quantity: 1,
      }]);

      if (options.onAddToCart) {
        options.onAddToCart(response);
      }
      showToast({
        message: placeholders?.Global?.AddedToCart || 'Product Added Successfully',
        description: model.name,
        variant: 'success',
      });
    } catch (error) {
      showToast({ message: error.message, variant: 'error' });
    } finally {
      setButtonState((prev) => ({
        ...prev,
        children: getAddToCartButtonLabel(model, placeholders),
        disabled: isOutOfStock,
      }));
    }
  };

  const buttonProps = {
    children: getAddToCartButtonLabel(model, placeholders),
    icon: isOutOfStock ? undefined : Icon({ source: 'Cart' }),
    variant: 'secondary',
    size: 'medium',
    disabled: isOutOfStock,
    onClick,
  };

  await Promise.all(mounts.map(async (mount) => {
    const instance = await UI.render(Button, buttonProps)(mount);
    instances.push(instance);
  }));
}

/**
 * @param {HTMLElement} card
 * @param {import('./normalize-product.js').ProductCardModel} model
 */
async function mountWishlist(card, model) {
  const mount = card.querySelector('.commerce-product-card__wishlist');
  if (!mount) return;

  await wishlistRender.render(WishlistToggle, {
    product: model.raw,
    variant: 'tertiary',
  })(mount);
}

/**
 * Builds the badge container for a single location. Top-left stacks all badges;
 * bottom is a single-badge bar (the model already caps it to one).
 * @param {import('./normalize-product.js').ProductCardBadge[]} badges
 * @param {'top-left'|'bottom'} location
 * @returns {HTMLElement|null}
 */
function buildBadges(badges, location) {
  const list = (badges || []).filter((badge) => badge.location === location);
  if (!list.length) return null;

  const wrap = document.createElement('div');
  wrap.className = `commerce-product-card__badges commerce-product-card__badges--${location}`;

  list.forEach((badge) => {
    const el = document.createElement('span');
    el.className = `commerce-product-card__badge commerce-product-card__badge--${badge.type}`;
    el.textContent = badge.label;
    // Author bg-color override (placeholder BgColor) wins over the CSS status
    // color; text color auto-adapts to it for contrast.
    if (badge.bgColor) {
      el.style.backgroundColor = badge.bgColor;
      if (badge.textColor) el.style.color = badge.textColor;
    }
    if (badge.isDummy) {
      el.dataset.dummy = 'true';
    }
    wrap.append(el);
  });

  return wrap;
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {ReturnType<typeof resolveCardDisplayOptions>} displayOptions
 * @returns {HTMLElement}
 */
function buildCardElement(model, displayOptions) {
  const card = document.createElement('article');
  card.className = 'commerce-product-card';
  card.dataset.sku = model.sku;

  if (displayOptions.layout === 'plp') {
    card.classList.add('commerce-product-card--layout-plp');
  }

  if (model.hoverImage) {
    card.classList.add('commerce-product-card--has-hover');
  }

  const media = document.createElement('div');
  mountProductCardMedia(media, model);

  const topBadges = buildBadges(model.badges, 'top-left');
  if (topBadges) media.append(topBadges);
  const bottomBadges = buildBadges(model.badges, 'bottom');
  if (bottomBadges) media.append(bottomBadges);

  const wishlist = document.createElement('div');
  wishlist.className = 'commerce-product-card__wishlist';
  media.append(wishlist);

  const actions = document.createElement('div');
  actions.className = 'commerce-product-card__actions';

  const footerActions = document.createElement('div');
  footerActions.className = 'commerce-product-card__actions commerce-product-card__actions--footer';

  const body = document.createElement('div');
  body.className = 'commerce-product-card__body';

  const titleLink = document.createElement('a');
  titleLink.className = 'commerce-product-card__title';
  titleLink.href = model.productUrl;
  titleLink.textContent = model.name;

  const swatches = buildSwatches(model);
  const pricing = buildPricingBlock(model, displayOptions);
  const rating = buildRatingRow(model.rating);
  const heading = buildHeadingBlock(model, titleLink, displayOptions);

  const content = document.createElement('div');
  content.className = 'commerce-product-card__content';
  if (rating) content.append(rating);
  content.append(heading);
  if (pricing) content.append(pricing);
  body.append(content);
  if (swatches) body.append(swatches);

  if (displayOptions.layout === 'plp') {
    media.append(actions);
    body.append(footerActions);
  } else {
    media.append(actions);
  }

  card.append(media, body);
  return card;
}

/**
 * Renders a merchandising product card into the given container.
 * @param {Element} container Host element
 * @param {{
 *   product: object,
 *   options?: object,
 *   context?: ProductCardRenderContext,
 * }} config
 * @returns {Promise<HTMLElement|null>}
 */
export async function renderProductCard(container, config) {
  const { product, options = {}, context } = config;
  const sharedContext = context || await prepareProductCardContext(options);
  const renderOptions = {
    ...options,
    placeholders: options.placeholders || sharedContext.placeholders,
    badgeConfig: options.badgeConfig || sharedContext.badgeConfig,
    useDummyData: options.useDummyData ?? sharedContext.useDummyData,
  };
  const displayOptions = resolveCardDisplayOptions(renderOptions.placeholders, renderOptions);

  const productView = toProductViewPayload(product);
  const productUrl = getProductLink(productView.urlKey, productView.sku);
  const model = normalizeProductView(productView, {
    productUrl,
    useDummyData: renderOptions.useDummyData !== false,
    badgeConfig: renderOptions.badgeConfig,
  });

  if (!model) {
    console.warn('renderProductCard: invalid product payload');
    return null;
  }

  container.textContent = '';

  const card = buildCardElement(model, displayOptions);
  if (!model.inStock) {
    card.classList.add('commerce-product-card--out-of-stock');
  }
  container.append(card);

  await Promise.all([
    mountWishlist(card, model),
    wireAddToCart(card, model, renderOptions.placeholders, renderOptions),
  ]);

  return card;
}

/**
 * Renders many product cards into a grid or list (PLP, sliders, recommendations).
 * CSS and placeholders load once and are reused for every item.
 *
 * @param {Element} container Host element (grid or list wrapper)
 * @param {{
 *   products: object[],
 *   options?: object,
 *   context?: ProductCardRenderContext,
 *   asList?: boolean,
 *   listClassName?: string,
 *   itemClassName?: string,
 *   itemTag?: string,
 * }} config
 * @returns {Promise<{ cards: (HTMLElement|null)[], context: ProductCardRenderContext }>}
 */
export async function renderProductCards(container, config) {
  const {
    products = [],
    options = {},
    context,
    asList = false,
    listClassName = 'commerce-product-card-list',
    itemClassName = 'commerce-product-card-list__item',
    itemTag = asList ? 'li' : 'div',
  } = config;

  const sharedContext = context || await prepareProductCardContext(options);
  container.textContent = '';

  let mountTarget = container;
  if (asList) {
    const list = document.createElement('ul');
    list.className = listClassName;
    container.append(list);
    mountTarget = list;
  }

  const cards = await Promise.all(products.map(async (product) => {
    const host = document.createElement(itemTag);
    host.className = itemClassName;
    mountTarget.append(host);

    return renderProductCard(host, {
      product,
      options,
      context: sharedContext,
    });
  }));

  return { cards, context: sharedContext };
}

export default renderProductCard;
