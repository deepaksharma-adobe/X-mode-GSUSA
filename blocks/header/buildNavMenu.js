import { rootLink } from '../../scripts/commerce.js';

/**
 * @typedef {import('./fetchNav.js').NavItem} NavItem
 */

/** Max links per column before flowing to the next — Figma 2938:22045 (~44px × 6 rows). */
const MEGA_MENU_MAX_LINKS_PER_COLUMN = 6;

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
 * Splits a nav item into one or more column chunks when link count exceeds the max.
 * @param {NavItem} item Second-level nav item
 * @returns {NavItem[]}
 */
function buildColumnChunks(item) {
  if (!item.children?.length) {
    return [item];
  }

  if (item.children.length <= MEGA_MENU_MAX_LINKS_PER_COLUMN) {
    return [item];
  }

  const chunks = [];
  for (let index = 0; index < item.children.length; index += MEGA_MENU_MAX_LINKS_PER_COLUMN) {
    chunks.push({
      href: item.href,
      label: item.label,
      children: item.children.slice(index, index + MEGA_MENU_MAX_LINKS_PER_COLUMN),
    });
  }
  return chunks;
}

/**
 * Builds a mega-menu column with a heading link and child links.
 * @param {NavItem} item Column item with optional nested children
 * @param {boolean} [showHeading=true] False for overflow columns (Figma 2938:22045)
 * @returns {HTMLLIElement}
 */
function buildColumnItem(item, showHeading = true) {
  const column = document.createElement('li');
  const heading = document.createElement('p');
  heading.append(createNavLink(item.href, item.label));
  if (!showHeading) {
    heading.className = 'mega-menu-heading-spacer';
    heading.setAttribute('aria-hidden', 'true');
  }
  column.append(heading);

  if (item.children?.length) {
    const list = document.createElement('ul');
    item.children.forEach((child) => {
      const row = document.createElement('li');
      row.append(createNavLink(child.href, child.label));
      list.append(row);
    });
    column.append(list);
  }

  return column;
}

/**
 * Builds the submenu list for a top-level nav item.
 * Each API child becomes one or more columns; long lists flow to the next column.
 * @param {NavItem[]} children Second-level nav items
 * @returns {HTMLUListElement}
 */
function buildSubmenuList(children) {
  const submenu = document.createElement('ul');
  children.forEach((child) => {
    const chunks = buildColumnChunks(child);
    chunks.forEach((chunk, chunkIndex) => {
      submenu.append(buildColumnItem(chunk, chunkIndex === 0));
    });
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
 * Inserts full-width row dividers when mega-menu columns wrap to a new line.
 * Figma 2697:357110 — horizontal rule between wrapped rows.
 * @param {HTMLUListElement|null|undefined} submenu Mega menu column list
 */
export function layoutMegaMenuRows(submenu) {
  if (!submenu) return;

  submenu.querySelectorAll(':scope > li.mega-menu-row-border').forEach((el) => el.remove());

  const columns = [...submenu.querySelectorAll(':scope > li:not(.mega-menu-row-border)')];
  if (columns.length < 2) return;

  const rowStarts = [];
  let rowTop = columns[0].offsetTop;

  columns.slice(1).forEach((column) => {
    if (column.offsetTop > rowTop) {
      rowStarts.push(column);
      rowTop = column.offsetTop;
    }
  });

  rowStarts.forEach((column) => {
    const divider = document.createElement('li');
    divider.className = 'mega-menu-row-border';
    divider.setAttribute('aria-hidden', 'true');
    submenu.insertBefore(divider, column);
  });
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
