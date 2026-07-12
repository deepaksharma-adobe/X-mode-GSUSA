import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import createCarouselControls from '../../carousel-controls.js';

const DEFAULT_IMAGE_SIZE = 320;

/**
 * @param {string} alt
 * @returns {HTMLDivElement}
 */
function createPlaceholderElement(alt) {
  const placeholder = document.createElement('div');
  placeholder.className = 'commerce-product-card__media-placeholder';
  placeholder.setAttribute('role', 'img');
  placeholder.setAttribute(
    'aria-label',
    alt ? `${alt}. Image not available.` : 'Image not available.',
  );
  return placeholder;
}

/**
 * @param {HTMLElement} container
 * @param {import('./normalize-product.js').ProductCardModel} model
 */
function mountPlaceholder(container, model) {
  container.append(createPlaceholderElement(model.name));
  container.closest('.commerce-product-card__media')
    ?.classList.add('commerce-product-card__media--placeholder');
}

/**
 * @param {import('./normalize-product.js').ProductCardImage|null} image
 * @param {string} alt
 * @param {number} size
 * @returns {HTMLImageElement|null}
 */
function createImage(image, alt, size) {
  if (!image?.url?.trim()) return null;

  const img = document.createElement('img');
  img.src = image.url;
  img.alt = alt;
  img.loading = 'lazy';
  img.width = size;
  img.height = size;
  img.decoding = 'async';
  img.className = 'commerce-product-card__media-image';
  img.addEventListener('error', () => {
    const media = img.closest('.commerce-product-card__media');
    const placeholder = createPlaceholderElement(alt);
    img.replaceWith(placeholder);
    media?.classList.add('commerce-product-card__media--placeholder');
  }, { once: true });
  return img;
}

/**
 * @param {HTMLElement} link
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {number} size
 */
function mountAemFallback(link, model, size) {
  const fallbackSrc = model.primaryImage?.url
    || model.galleryImages?.[0]?.url
    || model.raw?.images?.find((image) => image?.url?.trim())?.url;

  if (!fallbackSrc?.trim()) {
    mountPlaceholder(link, model);
    return;
  }

  try {
    tryRenderAemAssetsImage(
      { replaceWith: (element) => link.replaceWith(element) },
      {
        alias: model.sku,
        imageProps: {
          src: fallbackSrc.replace(/^https?:/, ''),
          alt: model.name,
          width: size,
          height: size,
        },
        wrapper: link,
        params: {
          width: size,
          height: size,
        },
      },
    );
  } catch (error) {
    console.warn('Product card image fallback failed, using placeholder.', model.sku, error);
    mountPlaceholder(link, model);
  }
}

/**
 * @param {HTMLElement} media
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {number} size
 * @param {HTMLElement} [parent]
 */
function appendHoverOverlay(media, model, size, parent = media) {
  if (!model.hoverImage) return;

  const hoverImg = createImage(model.hoverImage, model.name, size);
  if (!hoverImg) return;

  hoverImg.classList.add('commerce-product-card__media-image--hover');

  const overlay = document.createElement('div');
  overlay.className = 'commerce-product-card__media-hover-overlay';
  overlay.append(hoverImg);
  parent.append(overlay);
  media.classList.add('commerce-product-card__media--has-hover');
}

/**
 * Runs carousel layout sync once the track has measurable width (after DOM attach).
 * @param {HTMLElement} media
 * @param {HTMLElement} track
 * @param {() => void} sync
 */
function scheduleCarouselSync(media, track, sync) {
  const run = () => {
    sync();
  };

  const trySync = () => {
    if (!media.isConnected || track.clientWidth <= 0) {
      requestAnimationFrame(trySync);
      return;
    }
    run();
  };

  requestAnimationFrame(trySync);

  track.querySelectorAll('img').forEach((img) => {
    if (!img.complete) img.addEventListener('load', run, { once: true });
  });

  if (typeof ResizeObserver !== 'undefined') {
    const observer = new ResizeObserver(run);
    observer.observe(track);
  }
}

/**
 * @param {HTMLElement} media
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {number} size
 */
function mountHoverStack(media, model, size) {
  const link = document.createElement('a');
  link.className = 'commerce-product-card__media-link';
  link.href = model.productUrl;
  link.setAttribute('aria-hidden', 'true');
  link.tabIndex = -1;

  const stack = document.createElement('div');
  stack.className = 'commerce-product-card__media-stack';

  const primaryImg = createImage(model.primaryImage, model.name, size);
  if (primaryImg) {
    primaryImg.classList.add('commerce-product-card__media-image--primary');
    stack.append(primaryImg);
  }

  if (model.hoverImage) {
    const hoverImg = createImage(model.hoverImage, model.name, size);
    if (hoverImg) {
      hoverImg.classList.add('commerce-product-card__media-image--hover');
      stack.append(hoverImg);
      media.classList.add('commerce-product-card__media--has-hover');
    }
  }

  if (!primaryImg) {
    mountAemFallback(link, model, size);
    media.append(link);
    return;
  }

  link.append(stack);
  media.append(link);
}

/**
 * @param {HTMLElement} media
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {number} size
 */
function mountGalleryCarousel(media, model, size) {
  const images = model.galleryImages;
  if (images.length <= 1) {
    mountHoverStack(media, model, size);
    return;
  }

  media.classList.add('commerce-product-card__media--carousel');
  media.classList.add('commerce-product-card__media--slide-active-0');

  const viewport = document.createElement('div');
  viewport.className = 'commerce-product-card__media-viewport';

  const track = document.createElement('ul');
  track.className = 'commerce-product-card__media-track';
  const trackId = `commerce-product-card-media-${model.sku.replace(/[^a-z0-9-]/gi, '-')}`;
  track.id = trackId;

  images.forEach((image, index) => {
    const slide = document.createElement('li');
    slide.className = 'commerce-product-card__media-slide';

    const link = document.createElement('a');
    link.className = 'commerce-product-card__media-link';
    link.href = model.productUrl;
    link.setAttribute('aria-label', `${model.name}, image ${index + 1} of ${images.length}`);

    const img = createImage(image, model.name, size);
    if (img) {
      link.append(img);
    } else {
      mountPlaceholder(link, model);
    }

    slide.append(link);
    track.append(slide);
  });

  viewport.append(track);
  appendHoverOverlay(media, model, size, viewport);

  const step = () => track.clientWidth;

  const controls = createCarouselControls({
    prefix: 'commerce-product-card-media',
    count: images.length,
    controls: trackId,
    label: `${model.name} image controls`,
    itemNoun: 'image',
    prevLabel: 'Previous image',
    nextLabel: 'Next image',
    onPrev: () => track.scrollBy({ left: -step(), behavior: 'smooth' }),
    onNext: () => track.scrollBy({ left: step(), behavior: 'smooth' }),
  });

  const sync = () => {
    const slideWidth = step();
    if (slideWidth <= 0) {
      media.classList.add('commerce-product-card__media--slide-active-0');
      return;
    }

    const maxScroll = track.scrollWidth - track.clientWidth;
    controls.setArrowsDisabled(track.scrollLeft <= 1, track.scrollLeft >= maxScroll - 1);

    const active = Math.round(track.scrollLeft / slideWidth);
    // Hover overlay only on the first slide — otherwise it covers gallery images.
    media.classList.toggle('commerce-product-card__media--slide-active-0', active === 0);
  };

  track.addEventListener('scroll', sync, { passive: true });
  window.addEventListener('resize', sync, { passive: true });

  media.append(viewport, controls.prev, controls.next);
  scheduleCarouselSync(media, track, sync);
}

/**
 * @param {HTMLElement} container
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {{ imageSize?: number }} [options]
 */
export function mountProductCardMedia(container, model, options = {}) {
  const size = options.imageSize || DEFAULT_IMAGE_SIZE;
  container.classList.add('commerce-product-card__media');
  container.textContent = '';

  if (model.galleryImages.length > 1) {
    mountGalleryCarousel(container, model, size);
    return;
  }

  if (!model.primaryImage && model.galleryImages.length === 0) {
    const link = document.createElement('a');
    link.className = 'commerce-product-card__media-link';
    link.href = model.productUrl;
    mountAemFallback(link, model, size);
    container.append(link);
    return;
  }

  mountHoverStack(container, model, size);
}
