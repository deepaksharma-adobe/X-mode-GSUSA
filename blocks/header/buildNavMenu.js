import { rootLink } from '../../scripts/commerce.js';

/**
 * @typedef {import('./fetchNav.js').NavItem} NavItem
 */

/**
 * Creates a localized anchor for a nav item.
 * @param {string} href Item path
 * @param {string} label Link text
 * @returns {HTMLAnchorElement}
 */
function createNavLink(href, label) {
  const link = document.createElement('a');
  link.href = rootLink(href);
  link.textContent = label;
  return link;
}

/**
 * Approx vertical rows a group occupies: a (up to two-line) heading plus one
 * row per child link. Used to pack groups into columns.
 * @param {NavItem} item Second-level nav item
 * @returns {number}
 */
function groupWeight(item) {
  return 2 + (item.children?.length || 0);
}

/** Row budget per column — groups pack down a column until adding the next
 * would exceed this, then a new column starts (~2 groups per column,
 * Figma 8869:171142). */
const MEGA_MENU_MAX_ROWS_PER_COLUMN = 13;

/**
 * Builds a mega-menu group: a heading link plus its child links.
 * @param {NavItem} item Second-level nav item with optional nested children
 * @returns {HTMLElement}
 */
function buildGroup(item) {
  const group = document.createElement('div');
  group.className = 'mega-menu-group';
  const heading = document.createElement('p');
  heading.append(createNavLink(item.href, item.label));
  group.append(heading);

  if (item.children?.length) {
    const list = document.createElement('ul');
    item.children.forEach((child) => {
      const row = document.createElement('li');
      row.append(createNavLink(child.href, child.label));
      list.append(row);
    });
    group.append(list);
  }

  return group;
}

/**
 * Builds the submenu list, packing second-level groups into columns top-to-
 * bottom: a new group starts immediately below the previous one, and a new
 * column begins only when the row budget is exceeded — no blank space between
 * groups (Figma 8869:171142).
 * @param {NavItem[]} children Second-level nav items
 * @returns {HTMLUListElement}
 */
function buildSubmenuList(children) {
  const submenu = document.createElement('ul');
  let column = null;
  let rows = 0;

  children.forEach((child) => {
    const weight = groupWeight(child);
    if (!column || (rows > 0 && rows + weight > MEGA_MENU_MAX_ROWS_PER_COLUMN)) {
      column = document.createElement('li');
      column.className = 'mega-menu-column';
      submenu.append(column);
      rows = 0;
    }
    column.append(buildGroup(child));
    rows += weight;
  });

  return submenu;
}

/**
 * Builds a top-level nav list item from API data.
 * @param {NavItem} item Top-level nav item
 * @returns {HTMLLIElement}
 */
function buildTopLevelItem(item) {
  const row = document.createElement('li');
  // Menu path — used to look up this menu's promo fragment in placeholders/nav.json
  if (item.href) row.dataset.navPath = item.href;
  const label = document.createElement('p');
  label.append(createNavLink(item.href, item.label));
  row.append(label);

  if (item.children?.length) {
    row.append(buildSubmenuList(item.children));
  }

  return row;
}

/**
 * Builds the main navigation `<ul>` from API data.
 * @param {NavItem[]} navItems Top-level nav items
 * @returns {HTMLUListElement}
 */
export function buildNavMenuList(navItems) {
  const list = document.createElement('ul');
  navItems.forEach((item) => {
    list.append(buildTopLevelItem(item));
  });
  return list;
}

/**
 * Ensures a `.default-content-wrapper` exists inside `.nav-sections`.
 * @param {Element} navSections Nav menu section container
 * @returns {Element}
 */
function ensureNavWrapper(navSections) {
  let wrapper = navSections.querySelector('.default-content-wrapper');
  if (!wrapper) {
    wrapper = document.createElement('div');
    wrapper.className = 'default-content-wrapper';
    navSections.append(wrapper);
  }
  return wrapper;
}

/**
 * Replaces authored main-menu links with API-driven navigation.
 * Preserves any authored Account menu item for auth-combine wiring.
 * @param {Element} navSections Nav menu section container
 * @param {NavItem[]} navItems Top-level nav items from the API
 */
export function applyApiNavigation(navSections, navItems) {
  const wrapper = ensureNavWrapper(navSections);
  const accountItems = [...wrapper.querySelectorAll(':scope > ul > li.nav-account-menu')];
  const menuList = buildNavMenuList(navItems);

  wrapper.textContent = '';
  wrapper.append(menuList);
  accountItems.forEach((accountItem) => {
    menuList.append(accountItem);
  });
}

/**
 * Creates a `.nav-sections` container when the nav fragment has no menu section.
 * @returns {Element}
 */
export function createNavSectionsContainer() {
  const navSections = document.createElement('div');
  navSections.className = 'nav-sections';
  const wrapper = document.createElement('div');
  wrapper.className = 'default-content-wrapper';
  navSections.append(wrapper);
  return navSections;
}
