/**
 * Maps Catalog Service productView payloads to a stable card model.
 * Pure data — no DOM or dropin imports.
 */

/**
 * @typedef {object} ProductCardImage
 * @property {string} url
 * @property {string} [label]
 * @property {string[]} [roles]
 */

/**
 * @typedef {object} ProductCardPrice
 * @property {number|null} final
 * @property {number|null} regular
 * @property {string} currency
 * @property {boolean} onSale
 * @property {number|null} discountPercent
 * @property {string|null} formattedFinal
 * @property {string|null} formattedRegular
 */

/**
 * @typedef {object} ProductCardSwatch
 * @property {string} id
 * @property {string} label
 * @property {string|null} color
 * @property {string|null} [imageUrl]
 * @property {boolean} inStock
 * @property {boolean} [selected]
 */

/**
 * @typedef {object} ProductCardBadge
 * @property {string} type       Kebab-cased badge key, used for the CSS modifier.
 * @property {string} label      Display text.
 * @property {'top-left'|'bottom'} location  Where the badge renders on the card.
 * @property {number} hierarchy  Sort order within its location (lower = first).
 * @property {string} [bgColor]   Author bg-color override (from placeholder BgColor).
 * @property {string} [textColor] Auto-contrast text color when bgColor is set.
 * @property {boolean} [isDummy]
 */

/**
 * @typedef {object} ProductCardRating
 * @property {number|null} value
 * @property {number|null} count
 * @property {boolean} [isDummy]
 */

/**
 * @typedef {object} ProductCardModel
 * @property {string} sku
 * @property {string} name
 * @property {string} urlKey
 * @property {string} productUrl
 * @property {boolean} inStock
 * @property {boolean} isConfigurable
 * @property {string} typename
 * @property {ProductCardImage|null} primaryImage
 * @property {ProductCardImage|null} hoverImage
 * @property {ProductCardImage[]} galleryImages
 * @property {ProductCardPrice|null} price
 * @property {ProductCardBadge[]} badges
 * @property {ProductCardSwatch[]} swatches
 * @property {ProductCardRating|null} rating
 * @property {object} raw
 */

/** Placeholder merchandising data when CMS attributes are not yet mapped. */
export const DUMMY_RATING = { value: 4.6, count: 120, isDummy: true };

/** @type {ProductCardBadge[]} */
export const DUMMY_BADGES = [
  {
    type: 'new', label: 'NEW', location: 'top-left', hierarchy: 1, isDummy: true,
  },
  {
    type: 'best-seller', label: 'Best Seller', location: 'bottom', hierarchy: 1, isDummy: true,
  },
];

/**
 * @param {object[]|undefined} attributes
 * @param {string} name
 * @returns {unknown}
 */
function getAttributeValue(attributes, name) {
  return attributes?.find((attr) => attr.name === name)?.value;
}

/**
 * @param {object} product
 * @returns {string}
 */
export function getProductTypename(product) {
  return product?.typename || product?.__typename || product?.itemType || '';
}

/**
 * @param {object} product
 * @returns {boolean}
 */
export function resolveProductInStock(product) {
  return product?.inStock === true;
}

/**
 * @param {object} product
 * @returns {boolean}
 */
export function isConfigurableProduct(product) {
  const type = getProductTypename(product);
  if (type === 'ComplexProductView') return true;
  return Array.isArray(product?.options) && product.options.length > 0;
}

/**
 * @param {object} image
 * @returns {boolean}
 */
function isHoverImage(image) {
  return (image?.label || '').trim().toLowerCase() === 'hover';
}

/**
 * @param {object} image
 * @param {string} fallbackLabel
 * @returns {ProductCardImage|null}
 */
function toCardImage(image, fallbackLabel) {
  const url = (image.url || '').trim().replace(/^https?:/, '');
  if (!url) return null;

  return {
    url,
    label: image.label || fallbackLabel || '',
    roles: image.roles,
  };
}

/**
 * @param {object[]} images
 * @returns {object[]}
 */
function dedupeImagesByUrl(images) {
  const seen = new Set();
  return images.filter((image) => {
    const cardImage = toCardImage(image, '');
    if (!cardImage) return false;
    if (seen.has(cardImage.url)) return false;
    seen.add(cardImage.url);
    return true;
  });
}

/**
 * @param {object} product
 * @returns {{
 *   primary: ProductCardImage|null,
 *   hover: ProductCardImage|null,
 *   gallery: ProductCardImage[],
 * }}
 */
export function getCardImages(product) {
  const images = (product?.images || []).filter((image) => image?.url?.trim());
  const name = product?.name || '';

  const hoverSource = images.find(isHoverImage);
  const gallerySources = dedupeImagesByUrl(images.filter((image) => !isHoverImage(image)));

  const gallery = gallerySources
    .map((image) => toCardImage(image, name))
    .filter(Boolean);
  let hover = hoverSource ? toCardImage(hoverSource, name) : null;
  let primary = gallery[0] || null;

  // Hover-labeled images are never in the slider; if no other images exist, show hover only.
  if (!primary && hover) {
    primary = hover;
    hover = null;
  }

  return { primary, hover, gallery };
}

/**
 * @param {number|null} value
 * @param {string} currency
 * @returns {string|null}
 */
export function formatPrice(value, currency = 'USD') {
  if (value == null || Number.isNaN(value)) return null;
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
  }).format(value);
}

/**
 * @param {object} product
 * @returns {{ final: number|null, regular: number|null, currency: string }}
 */
export function getPriceAmounts(product) {
  const minimum = product?.priceRange?.minimum;
  const simple = product?.price;
  const finalAmount = minimum?.final?.amount ?? simple?.final?.amount;
  const regularAmount = minimum?.regular?.amount ?? simple?.regular?.amount;

  return {
    final: finalAmount?.value ?? null,
    regular: regularAmount?.value ?? null,
    currency: finalAmount?.currency ?? regularAmount?.currency ?? 'USD',
  };
}

/**
 * Sale offer is derived only from price: final must be less than regular.
 * `featured_items: "Sale"` alone does not create an offer badge.
 *
 * @param {object} product
 * @returns {ProductCardPrice|null}
 */
export function resolveCardPrice(product) {
  const { final, regular, currency } = getPriceAmounts(product);
  if (final == null && regular == null) return null;

  const displayFinal = final ?? regular;
  const onSale = final != null
    && regular != null
    && final < regular;
  const discountPercent = onSale && regular > 0
    ? Math.round((1 - final / regular) * 100)
    : null;

  return {
    final: displayFinal,
    regular: onSale ? regular : null,
    currency,
    onSale,
    discountPercent,
    formattedFinal: formatPrice(displayFinal, currency),
    formattedRegular: onSale ? formatPrice(regular, currency) : null,
  };
}

/**
 * Kebab-cases a ProductBadges config key for the CSS modifier.
 * @param {string} key e.g. "ShipsFromCnl" -> "ships-from-cnl"
 * @returns {string}
 */
function toBadgeType(key) {
  return String(key)
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Builds a badge lookup keyed by label text from the `ProductBadges` group in
 * placeholders/product.json. Each entry carries the CSS type, render location,
 * and hierarchy (sort order). Authors control which labels exist and where.
 * @param {object} [placeholders] Merged placeholders (see fetchPlaceholders).
 * @returns {Record<string, {type: string, location: 'top-left'|'bottom', hierarchy: number}>}
 */
export function buildBadgeConfig(placeholders = {}) {
  const group = placeholders?.ProductBadges;
  if (!group || typeof group !== 'object') return {};

  const config = {};
  Object.entries(group).forEach(([key, def]) => {
    const label = def?.label;
    if (!label) return;
    const location = String(def.location || '').trim().toLowerCase() === 'bottom'
      ? 'bottom'
      : 'top-left';
    // Optional author override for the badge background (any CSS color).
    const bgColor = (def.BgColor || def.bgColor || def.bgcolor || '').trim();
    config[label] = {
      type: toBadgeType(key),
      location,
      hierarchy: Number(def.hierarchy) || 0,
      bgColor,
    };
  });
  return config;
}

/**
 * Parses a hex (#rgb/#rgba/#rrggbb/#rrggbbaa) or rgb()/rgba() string to [r,g,b].
 * @param {string} input
 * @returns {[number, number, number]|null}
 */
function parseColor(input) {
  const s = String(input || '').trim();
  const hex = s.match(/^#([0-9a-f]{3,8})$/i);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = h.split('').map((c) => c + c).join('');
    return [
      parseInt(h.slice(0, 2), 16),
      parseInt(h.slice(2, 4), 16),
      parseInt(h.slice(4, 6), 16),
    ];
  }
  const rgb = s.match(/rgba?\(([^)]+)\)/i);
  if (rgb) {
    const parts = rgb[1].split(/[,/\s]+/).filter(Boolean).map(Number);
    if (parts.length >= 3 && parts.slice(0, 3).every((n) => !Number.isNaN(n))) {
      return [parts[0], parts[1], parts[2]];
    }
  }
  return null;
}

/**
 * Picks a readable text color for a given background using WCAG relative
 * luminance: dark text on light backgrounds, white on dark. Returns a CSS
 * variable string, or '' when the color can't be parsed (falls back to CSS).
 * @param {string} bg Any hex or rgb() color.
 * @returns {string}
 */
export function readableTextColor(bg) {
  const rgb = parseColor(bg);
  if (!rgb) return '';
  const lin = (c) => {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
  };
  const luminance = 0.2126 * lin(rgb[0]) + 0.7152 * lin(rgb[1]) + 0.0722 * lin(rgb[2]);
  return luminance > 0.5 ? 'var(--color-neutral-900)' : 'var(--color-neutral-50)';
}

/**
 * Maps the product's `product_labels` (from the API) to badge models via the
 * placeholder config. Top-left badges are all kept, ordered by hierarchy; the
 * bottom location keeps only the single highest-priority (lowest hierarchy) one.
 * @param {object} product
 * @param {Record<string, {type: string, location: string, hierarchy: number}>} [badgeConfig]
 * @returns {ProductCardBadge[]}
 */
export function getProductBadges(product, badgeConfig = {}) {
  const labels = Array.isArray(product?.product_labels) ? product.product_labels : [];
  if (!labels.length) return [];

  const byHierarchy = (a, b) => a.hierarchy - b.hierarchy;
  const matched = labels
    .map((label) => {
      const cfg = badgeConfig[label];
      if (!cfg) return null;
      return {
        type: cfg.type,
        label,
        location: cfg.location,
        hierarchy: cfg.hierarchy,
        bgColor: cfg.bgColor || '',
        textColor: cfg.bgColor ? readableTextColor(cfg.bgColor) : '',
      };
    })
    .filter(Boolean);

  const topLeft = matched.filter((b) => b.location === 'top-left').sort(byHierarchy);
  const bottom = matched.filter((b) => b.location === 'bottom').sort(byHierarchy).slice(0, 1);

  return [...topLeft, ...bottom];
}

/**
 * @param {ProductCardBadge[]} badges
 * @param {boolean} useDummyData
 * @returns {ProductCardBadge[]}
 */
export function applyDummyBadges(badges, useDummyData) {
  if (!useDummyData) return badges;

  /** @type {ProductCardBadge[]} */
  const result = [...badges];

  if (!result.some((badge) => badge.type === 'new')) {
    result.unshift(DUMMY_BADGES.find((badge) => badge.type === 'new'));
  }

  if (!result.some((badge) => badge.type === 'best-seller')) {
    result.push(DUMMY_BADGES.find((badge) => badge.type === 'best-seller'));
  }

  return result.filter(Boolean);
}

/**
 * Returns card rating from product attributes, or a placeholder until API data is wired.
 * Dummy rating is independent of `useDummyData` (badges only).
 * @param {object} product
 * @returns {ProductCardRating|null}
 */
export function getRating(product) {
  const rawRating = getAttributeValue(product?.attributes, 'rating_summary')
    ?? getAttributeValue(product?.attributes, 'rating');
  const rawCount = getAttributeValue(product?.attributes, 'review_count')
    ?? getAttributeValue(product?.attributes, 'reviews_count');

  let value = rawRating != null ? Number(rawRating) : null;
  const count = rawCount != null ? Number(rawCount) : null;

  if (value != null && !Number.isNaN(value) && value > 5) {
    value /= 20;
  }

  const hasRating = (value != null && !Number.isNaN(value))
    || (count != null && !Number.isNaN(count));

  if (!hasRating) {
    return { ...DUMMY_RATING };
  }

  return {
    value: value != null && !Number.isNaN(value) ? value : null,
    count: count != null && !Number.isNaN(count) ? count : null,
  };
}

/**
 * @param {object} product
 * @returns {boolean}
 */
export function isNewProduct(product) {
  const featured = getAttributeValue(product?.attributes, 'featured_items');
  const featuredList = Array.isArray(featured) ? featured : [];
  if (featuredList.includes('New')) return true;

  const from = getAttributeValue(product?.attributes, 'news_from_date');
  if (!from) return false;

  const start = new Date(from);
  if (Number.isNaN(start.getTime())) return false;

  const toValue = getAttributeValue(product?.attributes, 'news_to_date');
  const end = toValue ? new Date(toValue) : null;
  const now = new Date();

  if (now < start) return false;
  if (end && !Number.isNaN(end.getTime()) && now > end) return false;
  return true;
}

/**
 * @param {string} [type]
 * @returns {boolean}
 */
function isColorSwatchType(type) {
  const normalized = (type || '').toUpperCase();
  return normalized === 'COLOR' || normalized === 'COLOR_HEX';
}

/**
 * @param {string} [type]
 * @returns {boolean}
 */
function isImageSwatchType(type) {
  return (type || '').toUpperCase() === 'IMAGE';
}

/**
 * @param {string} raw
 * @returns {string|null}
 */
function normalizeHexColor(raw) {
  const value = (raw || '').trim();
  if (!value) return null;
  if (/^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return value;
  if (/^([0-9a-f]{3}|[0-9a-f]{6})$/i.test(value)) return `#${value}`;
  return null;
}

/**
 * @param {object} value
 * @returns {string}
 */
function getSwatchType(value) {
  return (value?.type || value?.typename || '').toUpperCase();
}

/**
 * @param {object} value
 * @returns {{ color: string|null, imageUrl: string|null }}
 */
function resolveSwatchVisual(value) {
  const raw = (value?.value || '').trim();
  const swatchType = getSwatchType(value);

  if (isImageSwatchType(swatchType)) {
    if (!raw) return { color: null, imageUrl: null };
    return { color: null, imageUrl: raw.replace(/^https?:/, '') };
  }

  if (isColorSwatchType(swatchType)) {
    return { color: normalizeHexColor(raw), imageUrl: null };
  }

  if (raw) {
    const hex = normalizeHexColor(raw);
    if (hex) return { color: hex, imageUrl: null };

    if (/^\/\/|^https?:\/\//i.test(raw) || /\.(png|jpe?g|webp|gif|svg)(\?|$)/i.test(raw)) {
      return { color: null, imageUrl: raw.replace(/^https?:/, '') };
    }
  }

  return { color: null, imageUrl: null };
}

/**
 * @param {object[]} options
 * @returns {object|null}
 */
function findColorOption(options) {
  if (!options?.length) return null;

  const byTitle = options.find((option) => /colou?r/i.test(option?.title || ''));
  if (byTitle?.values?.length) return byTitle;

  return options.find((option) => option?.values?.some((value) => (
    isColorSwatchType(getSwatchType(value))
    || isImageSwatchType(getSwatchType(value))
    || normalizeHexColor(value?.value)
  ))) || null;
}

/**
 * @param {object} product
 * @returns {ProductCardSwatch[]}
 */
function getSwatchesFromAttributes(product) {
  const colorAttr = product?.attributes?.find((attr) => (
    /^(color|colour|color_hex)$/i.test(attr?.name || '')
  ));
  if (!colorAttr?.value) return [];

  const values = Array.isArray(colorAttr.value) ? colorAttr.value : [colorAttr.value];

  return values
    .filter((entry) => entry != null && String(entry).trim())
    .slice(0, 6)
    .map((entry, index) => {
      const label = String(entry).trim();
      const { color, imageUrl } = resolveSwatchVisual({ value: label, type: 'COLOR_HEX' });
      return {
        id: `attr-${index}`,
        label,
        color,
        imageUrl,
        inStock: true,
        selected: index === 0,
      };
    })
    .filter((swatch) => swatch.color || swatch.imageUrl || swatch.label);
}

/**
 * @param {object} product
 * @returns {ProductCardSwatch[]}
 */
export function getSwatches(product) {
  const colorOption = findColorOption(product?.options || []);

  if (colorOption?.values?.length) {
    return colorOption.values
      .filter((value) => value?.title || value?.value || value?.id)
      .slice(0, 6)
      .map((value, index) => {
        const { color, imageUrl } = resolveSwatchVisual(value);
        return {
          id: value.id || value.title || String(index),
          label: value.title || '',
          color,
          imageUrl,
          inStock: value.inStock !== false,
          selected: index === 0,
        };
      })
      .filter((swatch) => swatch.color || swatch.imageUrl || swatch.label);
  }

  return getSwatchesFromAttributes(product);
}

/**
 * @param {object} product
 * @param {{ productUrl?: string, useDummyData?: boolean, badgeConfig?: object }} [options]
 * @returns {ProductCardModel|null}
 */
export function normalizeProductView(product, options = {}) {
  if (!product?.sku) return null;

  const useDummyData = options.useDummyData !== false;
  const { primary, hover, gallery } = getCardImages(product);
  const badges = applyDummyBadges(
    getProductBadges(product, options.badgeConfig),
    useDummyData,
  );

  return {
    sku: product.sku,
    name: product.name || '',
    urlKey: product.urlKey,
    productUrl: options.productUrl || '',
    inStock: resolveProductInStock(product),
    isConfigurable: isConfigurableProduct(product),
    typename: getProductTypename(product),
    primaryImage: primary,
    hoverImage: hover,
    galleryImages: gallery,
    price: resolveCardPrice(product),
    badges,
    swatches: getSwatches(product),
    rating: getRating(product),
    raw: product,
  };
}
