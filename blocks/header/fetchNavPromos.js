import { fetchPlaceholders } from '../../scripts/commerce.js';
import { loadFragment } from '../fragment/fragment.js';

/** Nav placeholder sheet: Key = top-level menu path ("/new"), Value = fragment path. */
const NAV_SHEET = 'placeholders/nav.json';

/** fragment path -> Promise<Element|null>; each promo fragment loads at most once. */
const fragmentPromises = new Map();

/**
 * Resolves the promo fragment mapped to a top-level menu path in the nav
 * placeholder sheet, or null when that menu has no mapping. The sheet and each
 * fragment are fetched at most once (placeholder cache + local cache).
 * @param {string} menuPath e.g. "/new"
 * @returns {Promise<Element|null>} decorated fragment root, or null
 */
export async function getNavPromo(menuPath) {
  if (!menuPath) return null;

  const labels = await fetchPlaceholders(NAV_SHEET);
  const fragmentPath = labels?.[menuPath];
  if (!fragmentPath) return null;

  const path = fragmentPath.startsWith('/') ? fragmentPath : `/${fragmentPath}`;
  if (!fragmentPromises.has(path)) {
    fragmentPromises.set(path, loadFragment(path).catch((error) => {
      // eslint-disable-next-line no-console
      console.warn(`header: nav promo fragment "${path}" failed to load`, error);
      return null;
    }));
  }
  return fragmentPromises.get(path);
}
