import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';

const NAV_CACHE_KEY = 'gs-nav-data';
const NAV_CACHE_TTL_SEC = 7200;
export const NAV_MOCK_PATH = '/blocks/header/nav-data.mock.json';

/**
 * @typedef {Object} NavItem
 * @property {string} label
 * @property {string} href
 * @property {string} [description]
 * @property {NavItem[]} [children]
 */

/**
 * Resolves a configured nav endpoint to an absolute URL.
 * @param {string} endpoint Path or absolute URL from config
 * @returns {string}
 */
function resolveNavUrl(endpoint) {
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  return `${window.location.origin}${path}`;
}

/**
 * Parses a nav API payload into a nav item array.
 * @param {Object} payload JSON response body
 * @returns {NavItem[]}
 */
function parseNavPayload(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.nav)) return payload.nav;
  return [];
}

/**
 * Loads nav JSON from a URL.
 * @param {string} url Absolute nav endpoint URL
 * @returns {Promise<NavItem[]>}
 */
async function fetchNavJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Nav fetch failed (${response.status})`);
  }
  const payload = await response.json();
  const nav = parseNavPayload(payload);
  if (!nav.length) {
    throw new Error('Nav payload is empty or invalid');
  }
  return nav;
}

/**
 * Reads cached nav data from sessionStorage when still valid.
 * @returns {NavItem[]|null}
 */
function readNavCache() {
  try {
    const cachedRaw = window.sessionStorage.getItem(NAV_CACHE_KEY);
    if (!cachedRaw) return null;
    const cached = JSON.parse(cachedRaw);
    if (!Array.isArray(cached?.nav)) return null;
    if (!cached[':expiry'] || cached[':expiry'] <= Math.round(Date.now() / 1000)) {
      return null;
    }
    return cached.nav;
  } catch {
    return null;
  }
}

/**
 * Stores nav data in sessionStorage with TTL.
 * @param {NavItem[]} nav Nav tree
 */
function writeNavCache(nav) {
  window.sessionStorage.setItem(NAV_CACHE_KEY, JSON.stringify({
    nav,
    ':expiry': Math.round(Date.now() / 1000) + NAV_CACHE_TTL_SEC,
  }));
}

/**
 * Fetches the main navigation tree from the configured API endpoint.
 * Falls back to the local mock JSON when the remote endpoint fails.
 * Swap `nav-api-endpoint` in config.json when the production API is ready.
 * @returns {Promise<NavItem[]>}
 */
export async function fetchNav() {
  const configuredEndpoint = await getConfigValue('nav-api-endpoint');
  const endpoint = configuredEndpoint || NAV_MOCK_PATH;
  const primaryUrl = resolveNavUrl(endpoint);
  const mockUrl = resolveNavUrl(NAV_MOCK_PATH);

  const cached = readNavCache();
  if (cached) return cached;

  try {
    const nav = await fetchNavJson(primaryUrl);
    writeNavCache(nav);
    return nav;
  } catch (error) {
    if (primaryUrl === mockUrl) throw error;
    // eslint-disable-next-line no-console
    console.warn('header: nav API unavailable, using mock data', error);
    const nav = await fetchNavJson(mockUrl);
    writeNavCache(nav);
    return nav;
  }
}
