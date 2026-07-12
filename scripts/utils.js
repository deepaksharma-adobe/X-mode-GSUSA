import { getRootPath } from '@dropins/tools/lib/aem/configs.js';

/**
 * Derives the category path from a URL by stripping the configured store/locale
 * root (via getRootPath — no locale guessing), the `.html` extension, and a
 * trailing `index`. Handles relative URLs and decodes path segments.
 * @param {string} [url=window.location.href] Absolute or relative URL
 * @returns {string|null} e.g. "/en/new-and-featured" → "new-and-featured"; null when empty
 */
export function getCategoryPath(url = window.location.href) {
  try {
    let { pathname } = new URL(url, window.location.origin);
    const root = getRootPath().replace(/\/$/, '');
    if (root && pathname.startsWith(`${root}/`)) {
      pathname = pathname.slice(root.length);
    }
    return pathname
      .replace(/\.html$/, '')
      .replace(/\/index$/, '')
      .split('/')
      .filter(Boolean)
      .map(decodeURIComponent)
      .join('/') || null;
  } catch {
    return null;
  }
}
