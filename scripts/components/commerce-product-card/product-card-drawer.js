import { Render } from '@dropins/tools/lib.js';
import { events } from '@dropins/tools/event-bus.js';
import { render as pdpRender } from '@dropins/storefront-pdp/render.js';
import {
  setEndpoint,
  initialize,
  getFetchedProductData,
  getProductConfigurationValues,
  isProductConfigurationValid,
} from '@dropins/storefront-pdp/api.js';
import { initializers } from '@dropins/tools/initializer.js';
import {
  Button,
  Image,
  provider as UI,
} from '@dropins/tools/components.js';
import * as Cart from '@dropins/storefront-cart/api.js';
import ProductPrice from '@dropins/storefront-pdp/containers/ProductPrice.js';
import ProductOptions from '@dropins/storefront-pdp/containers/ProductOptions.js';
import ProductQuantity from '@dropins/storefront-pdp/containers/ProductQuantity.js';
import { loadCSS, decorateIcons } from '../../aem.js';
import { CS_FETCH_GRAPHQL, fetchPlaceholders } from '../../commerce.js';
import { showToast } from '../toast/toast.js';
import '../../initializers/cart.js';

const DRAWER_SCOPE_PREFIX = 'product-card-drawer';
let drawerStylesLoaded = false;
let activeDrawer = null;

/**
 * @param {HTMLElement} drawer
 * @param {HTMLElement} initialFocus
 */
function trapFocus(drawer, initialFocus) {
  const focusable = drawer.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
  );

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  const handleKeyDown = (event) => {
    if (event.key === 'Tab') {
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    }
  };

  drawer.addEventListener('keydown', handleKeyDown);
  initialFocus.focus();

  return () => drawer.removeEventListener('keydown', handleKeyDown);
}

/**
 * @param {HTMLElement} root
 */
function unmountDropins(root) {
  root.querySelectorAll('[data-dropin-container]').forEach(Render.unmount);
}

/**
 * Adds a "Size guide" link to a size option field (Figma 6918:182903 — forest
 * link, top-right of the field label). Only for size fields; added once.
 * @param {HTMLElement} picker the .dropin-picker for the option
 * @param {HTMLSelectElement} select the underlying option select
 */
function addSizeGuideLink(picker, select) {
  const field = picker.closest('.pdp-swatches__field');
  if (!field || field.dataset.sizeGuideAdded) return;
  const labelText = (select.getAttribute('aria-label') || field.textContent || '').toLowerCase();
  if (!labelText.includes('size')) return; // size options only
  field.dataset.sizeGuideAdded = 'true';

  const link = document.createElement('a');
  link.className = 'commerce-product-card-drawer__size-guide';
  link.href = '/size-guide';
  link.textContent = 'Size guide';
  const icon = document.createElement('span');
  icon.className = 'commerce-product-card-drawer__size-guide-icon';
  icon.setAttribute('aria-hidden', 'true');
  link.prepend(icon);

  const label = field.querySelector('.pdp-swatches__field__label');
  if (label) label.append(link);
  else field.prepend(link);
}

/**
 * Progressive enhancement: the ProductOptions dropin renders non-swatch option
 * fields (e.g. Size) as a native <select>. Figma (node 6927:295893) wants those
 * as a wrapping grid of pill tags. We build tag buttons from the select's
 * options and mirror clicks back to the <select> (dispatching `input`+`change`)
 * so the dropin's own state/validation continues to drive add-to-cart. The
 * underlying <select> stays in the DOM (visually hidden) as the source of truth.
 * @param {HTMLElement} optionsMount
 */
function enhanceSizeSelects(optionsMount) {
  optionsMount.querySelectorAll('select.dropin-picker__select').forEach((select) => {
    const picker = select.closest('.dropin-picker');
    if (!picker) return;

    // Reuse the tag list across re-enhances (options populate async, so the
    // first call may see an empty select — we rebuild whenever it changes).
    let tagList = picker.querySelector('.commerce-product-card-drawer__size-tags');
    if (!tagList) {
      tagList = document.createElement('div');
      tagList.className = 'commerce-product-card-drawer__size-tags';
      tagList.setAttribute('role', 'listbox');
      picker.append(tagList);
    }
    picker.dataset.tagsEnhanced = 'true';

    const buildTags = () => {
      tagList.textContent = '';
      [...select.options].forEach((option) => {
        if (!option.value) return; // skip the empty "Choose an option" placeholder
        const tag = document.createElement('button');
        tag.type = 'button';
        tag.className = 'commerce-product-card-drawer__size-tag';
        tag.textContent = option.textContent.trim();
        tag.setAttribute('role', 'option');
        const selected = option.selected && !!option.value;
        tag.setAttribute('aria-selected', selected ? 'true' : 'false');
        tag.disabled = option.disabled;
        tag.addEventListener('click', () => {
          // Toggle: clicking the selected tag clears the choice (back to the
          // empty placeholder), so the shopper can deselect.
          const clearing = tag.getAttribute('aria-selected') === 'true';
          select.value = clearing ? '' : option.value;
          select.dispatchEvent(new Event('input', { bubbles: true }));
          select.dispatchEvent(new Event('change', { bubbles: true }));
          buildTags();
        });
        tagList.append(tag);
      });
    };

    buildTags();
    addSizeGuideLink(picker, select);
    // Rebuild once (guard against stacking listeners on repeated enhances) when
    // the dropin updates the select programmatically.
    if (!select.dataset.tagsSync) {
      select.dataset.tagsSync = 'true';
      select.addEventListener('change', buildTags);
    }
  });
}

/**
 * @param {import('./normalize-product.js').ProductCardModel} model
 * @param {HTMLElement|null} triggerEl
 * @param {object} [options]
 * @returns {Promise<void>}
 */
export async function openProductCardDrawer(model, triggerEl, options = {}) {
  if (activeDrawer) {
    activeDrawer.close();
  }

  if (!drawerStylesLoaded) {
    await loadCSS(`${window.hlx.codeBasePath}/scripts/components/commerce-product-card/product-card-drawer.css`);
    drawerStylesLoaded = true;
  }

  const placeholders = options.placeholders || await fetchPlaceholders();
  const pdpPlaceholders = await fetchPlaceholders('placeholders/pdp.json').catch(() => ({}));
  const langDefinitions = {
    default: {
      ...placeholders,
      ...pdpPlaceholders,
    },
  };
  const returnFocus = triggerEl || document.activeElement;

  const drawerScope = `${DRAWER_SCOPE_PREFIX}-${model.sku}-${Date.now()}`;

  const backdrop = document.createElement('div');
  backdrop.className = 'commerce-product-card-drawer__backdrop';
  backdrop.setAttribute('data-state', 'closed');

  const drawer = document.createElement('aside');
  drawer.className = 'commerce-product-card-drawer dropin-design';
  drawer.setAttribute('role', 'dialog');
  drawer.setAttribute('aria-modal', 'true');
  drawer.setAttribute('aria-label', placeholders?.Global?.AddProductToCart || 'Add to cart');

  const header = document.createElement('div');
  header.className = 'commerce-product-card-drawer__header';

  const title = document.createElement('h2');
  title.className = 'commerce-product-card-drawer__title';
  title.textContent = placeholders?.Global?.SelectProductOptions || 'Select Options';

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'commerce-product-card-drawer__close';
  closeBtn.setAttribute('aria-label', placeholders?.Global?.Close || 'Close');

  const closeIcon = document.createElement('span');
  closeIcon.className = 'icon icon-close';
  closeBtn.append(closeIcon);
  decorateIcons(closeBtn);

  header.append(title, closeBtn);

  const summary = document.createElement('div');
  summary.className = 'commerce-product-card-drawer__summary';

  const summaryImage = document.createElement('div');
  summaryImage.className = 'commerce-product-card-drawer__summary-image';

  const summaryBody = document.createElement('div');
  summaryBody.className = 'commerce-product-card-drawer__summary-body';

  const summaryName = document.createElement('p');
  summaryName.className = 'commerce-product-card-drawer__summary-name';
  summaryName.textContent = model.name;

  const summaryMeta = document.createElement('p');
  summaryMeta.className = 'commerce-product-card-drawer__summary-meta';

  summaryBody.append(summaryName, summaryMeta);
  summary.append(summaryImage, summaryBody);

  const optionsMount = document.createElement('div');
  optionsMount.className = 'commerce-product-card-drawer__options';

  const quantityLabel = document.createElement('p');
  quantityLabel.className = 'commerce-product-card-drawer__quantity-label';
  quantityLabel.textContent = placeholders?.Global?.quantityLabel || 'Quantity';

  const quantityMount = document.createElement('div');
  quantityMount.className = 'commerce-product-card-drawer__quantity';

  const quantitySection = document.createElement('div');
  quantitySection.className = 'commerce-product-card-drawer__quantity-section';
  quantitySection.append(quantityLabel, quantityMount);

  const loadingMessage = document.createElement('p');
  loadingMessage.className = 'commerce-product-card-drawer__loading';
  loadingMessage.textContent = placeholders?.Global?.Loading || 'Loading…';
  optionsMount.append(loadingMessage);

  const footer = document.createElement('div');
  footer.className = 'commerce-product-card-drawer__footer';

  // Validation hint (Figma 6918:182903) — shown above the price while required
  // options are unselected, e.g. "Choose your size to add to cart".
  const footerHint = document.createElement('p');
  footerHint.className = 'commerce-product-card-drawer__footer-hint';
  footerHint.setAttribute('role', 'status');
  footerHint.hidden = true;

  const footerPrice = document.createElement('div');
  footerPrice.className = 'commerce-product-card-drawer__footer-price';

  const footerButton = document.createElement('div');
  footerButton.className = 'commerce-product-card-drawer__footer-button';

  footer.append(footerHint, footerPrice, footerButton);
  drawer.append(header, summary, optionsMount, quantitySection, footer);
  backdrop.append(drawer);
  document.body.append(backdrop);

  let removeFocusTrap = () => {};
  let isLoading = false;
  let addButton = null;

  backdrop.setAttribute('data-state', 'open');
  document.body.classList.add('commerce-product-card-drawer-open');
  removeFocusTrap = trapFocus(drawer, closeBtn);

  function close() {
    backdrop.setAttribute('data-state', 'closed');
    document.body.classList.remove('commerce-product-card-drawer-open');
    document.removeEventListener('keydown', handleEscape);
    removeFocusTrap();
    unmountDropins(drawer);
    backdrop.remove();
    activeDrawer = null;
    if (returnFocus instanceof HTMLElement) {
      returnFocus.focus();
    }
  }

  function handleEscape(event) {
    if (event.key === 'Escape') close();
  }

  const handleBackdropClick = (event) => {
    if (event.target === backdrop) close();
  };

  backdrop.addEventListener('click', handleBackdropClick);
  document.addEventListener('keydown', handleEscape);
  closeBtn.addEventListener('click', close);

  activeDrawer = { close };

  try {
    setEndpoint(CS_FETCH_GRAPHQL);

    await initializers.mountImmediately(initialize, {
      scope: drawerScope,
      sku: model.sku,
      // No option pre-selected — the shopper picks size/colour explicitly.
      preselectFirstOption: false,
      langDefinitions,
      models: {
        ProductDetails: {
          fallbackData: (parent, refinedData) => ({
            ...parent,
            ...refinedData,
            images: refinedData.images?.length > 0 ? refinedData.images : parent.images,
            description: refinedData.description && refinedData.description !== ''
              ? refinedData.description
              : parent.description,
          }),
        },
      },
      acdl: false,
      persistURLParams: false,
    });

    const product = await getFetchedProductData({ scope: drawerScope });
    if (!product?.sku) {
      throw new Error(placeholders?.Global?.ProductLoadError || 'Product not available');
    }

    loadingMessage.remove();

    await UI.render(Image, {
      src: product.images?.[0]?.url || model.primaryImage?.url,
      alt: product.name,
      width: 96,
      height: 96,
      imageParams: { width: 96, height: 96 },
    })(summaryImage);

    [, addButton] = await Promise.all([
      pdpRender.render(ProductPrice, { scope: drawerScope })(footerPrice),
      UI.render(Button, {
        children: placeholders?.Global?.AddProductToCart,
        variant: 'primary',
        size: 'medium',
        disabled: true,
        onClick: async () => {
          if (isLoading) return;

          try {
            isLoading = true;
            addButton.setProps((prev) => ({
              ...prev,
              children: placeholders?.Global?.AddingToCart || 'Adding…',
              disabled: true,
            }));

            const values = getProductConfigurationValues({ scope: drawerScope });
            const valid = isProductConfigurationValid({ scope: drawerScope });
            if (!valid) {
              throw new Error('Please select all required options');
            }

            const response = await Cart.addProductsToCart([{
              sku: values.sku || model.sku,
              quantity: values.quantity || 1,
              ...(values.optionsUIDs?.length ? { optionsUIDs: values.optionsUIDs } : {}),
            }]);

            events.emit('cart/updated', response);
            if (options.onAddToCart) {
              options.onAddToCart(response);
            }
            close();
            showToast({
              message: placeholders?.Global?.AddedToCart || 'Product Added Successfully',
              description: model.name,
              variant: 'success',
            });
          } catch (error) {
            showToast({ message: error.message, variant: 'error' });
          } finally {
            isLoading = false;
            addButton.setProps((prev) => ({
              ...prev,
              children: placeholders?.Global?.AddProductToCart,
              disabled: !isProductConfigurationValid({ scope: drawerScope }) || isLoading,
            }));
          }
        },
      })(footerButton),
      pdpRender.render(ProductOptions, {
        hideSelectedValue: false,
        scope: drawerScope,
      })(optionsMount),
      pdpRender.render(ProductQuantity, { scope: drawerScope })(quantityMount),
    ]);

    // Turn non-swatch option selects (e.g. Size) into Figma pill tags.
    enhanceSizeSelects(optionsMount);
    // Re-enhance if the dropin re-renders options (e.g. after a variant change).
    events.on('pdp/data', () => enhanceSizeSelects(optionsMount), { eager: true, scope: drawerScope });

    // Footer hint (Figma 6918:182903): while a required option is unselected,
    // prompt "Choose your <option(s)> to add to cart" above the price. Detects
    // unselected fields from the DOM (swatch = no aria-checked; size tags = no
    // aria-selected) so the message names exactly what the shopper still needs.
    const fieldName = (field) => {
      const label = field.querySelector('.pdp-swatches__field__label, .dropin-product-option__label');
      // Read only the label's own text — exclude the injected Size guide link.
      const raw = [...(label?.childNodes || [])]
        .filter((n) => n.nodeType === Node.TEXT_NODE || !n.classList?.contains('commerce-product-card-drawer__size-guide'))
        .map((n) => n.textContent)
        .join('');
      return raw.replace(/:.*/, '').trim().toLowerCase();
    };

    const updateHint = () => {
      if (isProductConfigurationValid({ scope: drawerScope })) {
        footerHint.hidden = true;
        return;
      }
      const unselected = [...optionsMount.querySelectorAll('.pdp-swatches__field')]
        .filter((field) => !field.querySelector('[aria-checked="true"], .commerce-product-card-drawer__size-tag[aria-selected="true"]'))
        .map(fieldName)
        .filter(Boolean);
      if (!unselected.length) {
        footerHint.hidden = true;
        return;
      }
      footerHint.textContent = `Choose your ${unselected.join(' and ')} to add to cart`;
      footerHint.hidden = false;
    };

    // The selected colour swatch exposes its label via aria-label, e.g.
    // "Color: Blue swatch selected". Mirror it into the summary meta line as
    // "<title>: <value>" with the value emphasised.
    const updateSummaryMeta = () => {
      const checked = optionsMount.querySelector('.dropin-color-swatch:checked');
      const raw = checked?.getAttribute('aria-label') || '';
      const match = raw.match(/^(.*?):\s*(.*?)\s*(?:swatch)?\s*(?:selected)?$/i);
      summaryMeta.textContent = '';
      if (!match || !match[2]) return;
      const [, optionTitle, optionValue] = match;
      const metaLabel = document.createElement('span');
      metaLabel.className = 'commerce-product-card-drawer__summary-meta-label';
      metaLabel.textContent = `${optionTitle}: `;
      const metaValue = document.createElement('span');
      metaValue.className = 'commerce-product-card-drawer__summary-meta-value';
      metaValue.textContent = optionValue;
      summaryMeta.append(metaLabel, metaValue);
    };

    events.on(
      'pdp/valid',
      (valid) => {
        addButton?.setProps((prev) => ({
          ...prev,
          disabled: !valid || isLoading || product.inStock === false,
        }));
        updateHint();
        updateSummaryMeta();
      },
      { eager: true, scope: drawerScope },
    );

    if (product.inStock === false) {
      addButton?.setProps((prev) => ({ ...prev, disabled: true }));
    }
  } catch (error) {
    loadingMessage.remove();
    close();
    showToast({ message: error.message, variant: 'error' });
  }

  return new Promise((resolve) => {
    const observer = new MutationObserver(() => {
      if (!document.body.contains(backdrop)) {
        observer.disconnect();
        document.removeEventListener('keydown', handleEscape);
        resolve();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
  });
}
