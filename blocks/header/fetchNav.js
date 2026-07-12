import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import { CS_FETCH_GRAPHQL } from '../../scripts/commerce.js';

const NAV_CACHE_KEY = 'gs-nav-data';
const NAV_CACHE_TTL_SEC = 7200;
const DEFAULT_ROOT_CATEGORY_ID = '2';

/**
 * @typedef {Object} NavItem
 * @property {string} label
 * @property {string} href
 * @property {NavItem[]} [children]
 */

/**
 * @typedef {Object} CategoryView
 * @property {string} id
 * @property {string} name
 * @property {number} position
 * @property {string} parentId
 * @property {string} urlPath
 */

/**
 * Catalog Service category tree used to build the main navigation. The root
 * category is the menu container (its children are the top-level nav items).
 */
const CATEGORIES_QUERY = `query GET_NAV_CATEGORIES($ids: [String!]!) {
  categories(
    ids: $ids
    roles: ["active", "show_in_menu"]
    subtree: { depth: 3, startLevel: 10 }
  ) {
    id
    name
    position
    parentId
    urlPath
  }
}`;

/**
 * Turns a flat list of categories into the nested nav tree that buildNavMenu
 * expects. Hierarchy is reconstructed from parentId; siblings are ordered by the
 * merchandising `position` (the API returns categories in id order, not menu
 * order). The root category is the container, so its children become the
 * top-level items. Categories whose parent isn't in the payload are dropped.
 * @param {CategoryView[]} categories Flat category list from the API
 * @param {string} rootId Container category id (its children are top-level)
 * @returns {NavItem[]}
 */
function buildNavTree(categories, rootId) {
  const byId = new Map();
  categories.forEach((category) => {
    byId.set(category.id, { ...category, items: [] });
  });

  const roots = [];
  byId.forEach((node) => {
    if (node.id === rootId) return;
    if (node.parentId === rootId) {
      roots.push(node);
      return;
    }
    const parent = byId.get(node.parentId);
    if (parent) parent.items.push(node);
  });

  const byPosition = (a, b) => a.position - b.position;
  const toNavItem = (node) => {
    node.items.sort(byPosition);
    const navItem = { label: node.name, href: `/${node.urlPath}` };
    if (node.items.length) {
      navItem.children = node.items.map(toNavItem);
    }
    return navItem;
  };

  roots.sort(byPosition);
  return roots.map(toNavItem);
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
 * Fetches the main navigation tree from the Catalog Service category query and
 * transforms it into a nested nav tree. Results are cached in sessionStorage.
 * The root category id can be overridden via the `commerce-root-category-id`
 * config value (defaults to "2").
 * @returns {Promise<NavItem[]>}
 */
export async function fetchNav() {
  const cached = readNavCache();
  if (cached) return cached;

  const rootId = (await getConfigValue('commerce-root-category-id')) || DEFAULT_ROOT_CATEGORY_ID;
  const { data, errors } = await CS_FETCH_GRAPHQL.fetchGraphQl(CATEGORIES_QUERY, {
    method: 'GET',
    variables: { ids: [rootId] },
  });

  if (errors?.length) {
    throw new Error(`Nav categories query failed: ${errors.map((e) => e.message).join('; ')}`);
  }

  const nav = buildNavTree(data?.categories ?? [], rootId);
  if (nav.length) writeNavCache(nav);
  return nav;
}
