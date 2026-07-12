import { loadCSS } from '../../aem.js';

const AUTO_DISMISS_MS = 4000;
const VARIANTS = new Set(['success', 'error', 'info']);

let stylesLoaded = false;
let region = null;

function ensureRegion() {
  if (region?.isConnected) return region;
  region = document.createElement('div');
  region.className = 'gs-toast-region';
  region.setAttribute('role', 'region');
  region.setAttribute('aria-label', 'Notifications');
  document.body.append(region);
  return region;
}

/**
 * Show a dismissible toast notification. Reusable across the site.
 * @param {object} config
 * @param {string} config.message - Primary text (bold title line).
 * @param {string} [config.description] - Optional second line (e.g. product name).
 * @param {'success'|'error'|'info'} [config.variant] - Visual style. Defaults to 'success'.
 * @param {number} [config.duration] - Auto-dismiss delay in ms. Pass 0 to disable.
 * @returns {Promise<{ dismiss: () => void }>}
 */
export async function showToast({
  message, description, variant = 'success', duration = AUTO_DISMISS_MS,
} = {}) {
  if (!message) return { dismiss: () => {} };

  if (!stylesLoaded) {
    await loadCSS(`${window.hlx.codeBasePath}/scripts/components/toast/toast.css`);
    stylesLoaded = true;
  }

  const safeVariant = VARIANTS.has(variant) ? variant : 'success';
  const host = ensureRegion();

  const toast = document.createElement('div');
  toast.className = `gs-toast gs-toast--${safeVariant}`;
  toast.setAttribute('role', safeVariant === 'error' ? 'alert' : 'status');
  toast.setAttribute('aria-live', safeVariant === 'error' ? 'assertive' : 'polite');

  const icon = document.createElement('span');
  icon.className = 'gs-toast__icon';
  icon.setAttribute('aria-hidden', 'true');

  const body = document.createElement('div');
  body.className = 'gs-toast__body';

  const title = document.createElement('p');
  title.className = 'gs-toast__title';
  title.textContent = message;
  body.append(title);

  if (description) {
    const desc = document.createElement('p');
    desc.className = 'gs-toast__description';
    desc.textContent = description;
    body.append(desc);
  }

  const closeBtn = document.createElement('button');
  closeBtn.type = 'button';
  closeBtn.className = 'gs-toast__close';
  closeBtn.setAttribute('aria-label', 'Dismiss notification');

  toast.append(icon, body, closeBtn);
  host.append(toast);

  // Trigger the enter transition on the next frame.
  requestAnimationFrame(() => toast.setAttribute('data-state', 'open'));

  let timer;
  const dismiss = () => {
    if (!toast.isConnected) return;
    clearTimeout(timer);
    toast.setAttribute('data-state', 'closing');
    const remove = () => {
      toast.remove();
      if (region && !region.children.length) {
        region.remove();
        region = null;
      }
    };
    toast.addEventListener('transitionend', remove, { once: true });
  };

  closeBtn.addEventListener('click', dismiss);
  if (duration > 0) {
    timer = setTimeout(dismiss, duration);
  }

  return { dismiss };
}
