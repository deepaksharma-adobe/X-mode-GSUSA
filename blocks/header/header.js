// Drop-in Tools
import { events } from '@dropins/tools/event-bus.js';

import { tryRenderAemAssetsImage } from '@dropins/tools/lib/aem/assets.js';
import { getConfigValue } from '@dropins/tools/lib/aem/configs.js';
import { getMetadata } from '../../scripts/aem.js';
import { loadFragment } from '../fragment/fragment.js';
import { fetchPlaceholders, getProductLink, rootLink } from '../../scripts/commerce.js';

import { setAudience, clearAudience, isLeaderAudience } from '../../scripts/audience.js';
import { applyApiNavigation, createNavSectionsContainer, layoutMegaMenuRows } from './buildNavMenu.js';
import { fetchNav } from './fetchNav.js';
import renderAuthCombine from './renderAuthCombine.js';
import { renderAuthDropdown } from './renderAuthDropdown.js';
import renderSellerAssistedBuyingBanner from './renderSellerAssistedBuyingBanner.js';

// Desktop nav layout + hover mega menu (1100px+; mobile header below 1100px)
const isDesktop = window.matchMedia('(min-width: 1100px)');

const labels = await fetchPlaceholders();

const overlay = document.createElement('div');
overlay.classList.add('overlay');
document.querySelector('header').insertAdjacentElement('afterbegin', overlay);

function closeOnEscape(e) {
  if (e.code === 'Escape') {
    const nav = document.getElementById('nav');
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      closeDesktopMegaMenu(navSections);
      const focusTarget = navSectionExpanded.querySelector(':scope > p > a');
      if (focusTarget) focusTarget.focus();
      else navSectionExpanded.focus();
    } else if (!isDesktop.matches) {
      toggleMenu(nav, navSections);
      overlay.classList.remove('show');
      nav.querySelector('button').focus();
      const navWrapper = document.querySelector('.nav-wrapper');
      navWrapper.classList.remove('active');
    }
  }
}

function closeOnFocusLost(e) {
  const nav = e.currentTarget;
  if (!nav.contains(e.relatedTarget)) {
    const navSections = nav.querySelector('.nav-sections');
    if (!navSections) return;
    const navSectionExpanded = navSections.querySelector('[aria-expanded="true"]');
    if (navSectionExpanded && isDesktop.matches) {
      closeDesktopMegaMenu(navSections);
    } else if (!isDesktop.matches) {
      toggleMenu(nav, navSections, true);
    }
  }
}

function openOnKeydown(e) {
  const focused = document.activeElement;
  const navSection = focused.closest('.nav-drop');
  if (!navSection || focused.tagName !== 'A') return;
  if (e.code !== 'Enter' && e.code !== 'Space') return;

  const navSections = navSection.closest('.nav-sections');
  const dropExpanded = navSection.getAttribute('aria-expanded') === 'true';

  if (e.code === 'Space') {
    e.preventDefault();
  } else if (dropExpanded) {
    return;
  } else {
    e.preventDefault();
  }

  if (dropExpanded) {
    closeDesktopMegaMenu(navSections);
  } else {
    openDesktopMegaMenu(navSections, navSection);
  }
}

/**
 * Keeps aria-expanded in sync on the top-level nav item and its link.
 * @param {Element} navSection Top-level nav list item
 * @param {boolean} expanded Whether the section is expanded
 */
function setNavDropExpanded(navSection, expanded) {
  const value = expanded ? 'true' : 'false';
  navSection.setAttribute('aria-expanded', value);
  const link = navSection.querySelector(':scope > p > a');
  link?.setAttribute('aria-expanded', value);

  const wrapper = navSection.querySelector(':scope .submenu-wrapper');
  if (!wrapper) return;

  if (expanded) {
    wrapper.removeAttribute('inert');
    wrapper.removeAttribute('aria-hidden');
  } else {
    wrapper.setAttribute('inert', '');
    wrapper.setAttribute('aria-hidden', 'true');
  }
}

/**
 * Toggles a mobile accordion section from the keyboard (Space only — Enter follows the link).
 * @param {Element} navSections Nav menu section container
 * @param {Element} navSection Top-level nav list item
 */
function toggleMobileAccordion(navSections, navSection) {
  const wasActive = navSection.classList.contains('active');
  closeMobileAccordions(navSections, wasActive ? null : navSection);
  if (!wasActive) {
    navSection.classList.add('active');
    setNavDropExpanded(navSection, true);
  } else {
    navSection.classList.remove('active');
    setNavDropExpanded(navSection, false);
  }
}

/**
 * Keyboard support on category links (desktop mega menu + mobile accordion).
 * @param {Element} navSection Top-level nav list item
 * @param {Element} navSections Nav menu section container
 */
function setupNavDropLink(navSection, navSections) {
  const link = navSection.querySelector(':scope > p > a');
  if (!link || !navSection.classList.contains('nav-drop')) return;

  link.setAttribute('aria-haspopup', 'menu');

  link.addEventListener('focus', () => {
    if (isDesktop.matches) openDesktopMegaMenu(navSections, navSection);
  });

  link.addEventListener('keydown', (e) => {
    if (e.code !== 'Enter' && e.code !== 'Space') return;

    if (isDesktop.matches) {
      openOnKeydown(e);
      return;
    }

    if (e.code === 'Space') {
      e.preventDefault();
      toggleMobileAccordion(navSections, navSection);
    }
  });
}

/**
 * Toggles all nav sections
 * @param {Element} sections The container element
 * @param {Boolean} expanded Whether the element should be expanded or collapsed
 */
function toggleAllNavSections(sections, expanded = false) {
  if (!sections) return;
  sections
    .querySelectorAll('.nav-sections .default-content-wrapper > ul > li')
    .forEach((section) => {
      setNavDropExpanded(section, expanded);
    });
}

/**
 * Locks page scroll when the mobile menu is open without shifting layout (scrollbar width).
 * @param {boolean} locked Whether scroll should be locked
 * @param {Element} [navWrapper] The nav wrapper to pad when the scrollbar disappears
 */
function setMobileMenuScrollLock(locked, navWrapper) {
  const { body } = document;
  if (locked) {
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      body.style.setProperty('padding-right', `${scrollbarWidth}px`);
      if (navWrapper) navWrapper.style.setProperty('padding-right', `${scrollbarWidth}px`);
    }
    body.style.overflowY = 'hidden';
    return;
  }
  body.style.overflowY = '';
  body.style.removeProperty('padding-right');
  if (navWrapper) navWrapper.style.removeProperty('padding-right');
}

/**
 * Toggles the entire nav
 * @param {Element} nav The container element
 * @param {Element} navSections The nav sections within the container element
 * @param {*} forceExpanded Optional param to force nav expand behavior when not null
 */
function toggleMenu(nav, navSections, forceExpanded = null) {
  const expanded = forceExpanded !== null ? !forceExpanded : nav.getAttribute('aria-expanded') === 'true';
  const button = nav.querySelector('.nav-hamburger button');
  const navWrapper = nav.closest('.nav-wrapper');
  setMobileMenuScrollLock(!expanded && !isDesktop.matches, navWrapper);
  nav.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  if (navSections) navSections.classList.remove('nav-mega-switching');
  toggleAllNavSections(navSections, false);
  closeMobileAccordions(navSections);
  button.setAttribute('aria-label', expanded ? 'Open navigation' : 'Close navigation');
  button.setAttribute('aria-expanded', expanded ? 'false' : 'true');
  // Desktop keyboard: tab stops on links only (not li wrappers)
  if (navSections) {
    navSections.querySelectorAll('.nav-drop').forEach((drop) => {
      drop.removeAttribute('tabindex');
    });
  }

  // enable menu collapse on escape keypress
  if (!expanded || isDesktop.matches) {
    // collapse menu on escape press
    window.addEventListener('keydown', closeOnEscape);
    // collapse menu on focus lost
    nav.addEventListener('focusout', closeOnFocusLost);
  } else {
    window.removeEventListener('keydown', closeOnEscape);
    nav.removeEventListener('focusout', closeOnFocusLost);
  }
}

const subMenuHeader = document.createElement('div');
subMenuHeader.classList.add('submenu-header');
subMenuHeader.innerHTML = '<h5 class="back-link">All Categories</h5><hr />';

const OFFER_DISMISS_KEY = 'gs-header-offer-dismissed';

/**
 * Re-measures open mega menu columns and inserts row dividers after layout.
 * @param {Element|null} navSection Top-level nav item with an open submenu
 * @param {boolean} [immediate=false] Run layout synchronously (menu switch)
 */
function refreshMegaMenuLayout(navSection, immediate = false) {
  if (!navSection || !isDesktop.matches) return;
  const submenu = navSection.querySelector(':scope .submenu-wrapper > ul');
  if (immediate) {
    layoutMegaMenuRows(submenu);
    return;
  }
  requestAnimationFrame(() => layoutMegaMenuRows(submenu));
}

/**
 * Closes the desktop mega menu and restores open/close transitions.
 * @param {Element|null} navSections Nav menu section container
 */
function closeDesktopMegaMenu(navSections) {
  if (!navSections) return;
  navSections.classList.remove('nav-mega-switching');
  toggleAllNavSections(navSections, false);
  overlay.classList.remove('show');
}

/**
 * Opens a desktop mega menu panel; switches instantly when another panel is already open.
 * @param {Element} navSections Nav menu section container
 * @param {Element} navSection Top-level nav item to open
 */
function openDesktopMegaMenu(navSections, navSection) {
  const currentOpen = navSections.querySelector(
    ':scope .default-content-wrapper > ul > li[aria-expanded="true"]',
  );
  const isSwitch = Boolean(currentOpen && currentOpen !== navSection);

  navSections.classList.toggle('nav-mega-switching', isSwitch);

  navSections
    .querySelectorAll(':scope .default-content-wrapper > ul > li')
    .forEach((section) => {
      setNavDropExpanded(section, section === navSection);
    });

  overlay.classList.add('show');
  refreshMegaMenuLayout(navSection, isSwitch);
}

/**
 * @param {Element} section Nav fragment section
 * @returns {Element}
 */
function sectionContent(section) {
  return section.querySelector('.default-content-wrapper') || section;
}

/**
 * @param {Element} section Nav fragment section
 * @returns {boolean}
 */
function hasMainNavList(section) {
  const ul = sectionContent(section).querySelector(':scope > ul');
  return Boolean(ul?.querySelector(':scope > li'));
}

/**
 * Promo / offer bar: prose plus CTA links, not the main nav or lone home logo.
 * @param {Element} section Nav fragment section
 * @returns {boolean}
 */
function isOfferSection(section) {
  if (hasMainNavList(section)) return false;
  const wrapper = sectionContent(section);
  if (wrapper.querySelector('.offer-banner')) return true;
  const links = [...wrapper.querySelectorAll('a')];
  const paragraphs = wrapper.querySelectorAll('p');
  if (!paragraphs.length || !links.length) return false;
  if (links.length === 1) {
    try {
      return new URL(links[0].href, window.location.origin).pathname !== '/';
    } catch {
      return true;
    }
  }
  return true;
}

/**
 * Brand row: home link, logo image, or icon — not the main nav menu.
 * @param {Element} section Nav fragment section
 * @returns {boolean}
 */
function isBrandSection(section) {
  if (hasMainNavList(section)) return false;
  const wrapper = sectionContent(section);
  if (wrapper.querySelector('picture, img, .icon[class*="logo"]')) return true;
  const links = [...wrapper.querySelectorAll('a')];
  if (links.length !== 1) return false;
  try {
    return new URL(links[0].href, window.location.origin).pathname === '/';
  } catch {
    return false;
  }
}

/**
 * Maps nav fragment sections to brand, menu, and tools slots; extracts optional offer bar.
 * Supports 4-section CMS order [offer, brand, menu, tools] or 3-section [offer, brand, menu].
 * @param {Element} nav The <nav> element with fragment children
 * @returns {{ offerBar: Element|null }}
 */
function classifyNavFragment(nav) {
  let offerBar = null;
  const sections = [...nav.children];

  const applyRoles = (brandSection, menuSection, toolsSection) => {
    brandSection?.classList.add('nav-brand');
    menuSection?.classList.add('nav-sections');
    if (toolsSection) {
      toolsSection.classList.add('nav-tools');
    } else {
      const tools = document.createElement('div');
      tools.className = 'nav-tools';
      nav.append(tools);
    }
  };

  if (sections.length >= 4) {
    const [offerSection, brandSection, menuSection, toolsSection] = sections;
    offerBar = buildOfferBar(offerSection);
    offerSection.remove();
    applyRoles(brandSection, menuSection, toolsSection);
    return { offerBar };
  }

  let remaining = [...nav.children];
  const offerIndex = remaining.findIndex(isOfferSection);
  if (offerIndex >= 0) {
    const [offerSection] = remaining.splice(offerIndex, 1);
    offerBar = buildOfferBar(offerSection);
    offerSection.remove();
    remaining = [...nav.children];
  }

  const menuSection = remaining.find(hasMainNavList);
  const brandSection = remaining.find(
    (section) => section !== menuSection && isBrandSection(section),
  );

  if (menuSection || brandSection) {
    const toolsSection = remaining.find(
      (section) => section !== menuSection && section !== brandSection,
    );
    applyRoles(brandSection, menuSection, toolsSection);
    return { offerBar };
  }

  // Fallback: legacy positional mapping when heuristics do not match
  ['brand', 'sections', 'tools'].forEach((role, index) => {
    nav.children[index]?.classList.add(`nav-${role}`);
  });
  if (!nav.querySelector('.nav-tools')) {
    const tools = document.createElement('div');
    tools.className = 'nav-tools';
    nav.append(tools);
  }

  return { offerBar };
}

/**
 * Splits authored offer copy into a lead line and code segment for responsive layout.
 * @param {string} message Full offer message from the nav fragment
 * @returns {{ lead: string, code: string, full: string }}
 */
function parseOfferMessage(message) {
  const full = message.trim();
  const splitMatch = full.match(/^(.*?)\s*–\s*(Use Code:\s*.+)$/i);
  if (splitMatch) {
    return {
      lead: `${splitMatch[1].trim()} –`,
      code: splitMatch[2].trim(),
      full,
    };
  }
  const codeIndex = full.search(/\bUse Code:/i);
  if (codeIndex > 0) {
    return {
      lead: full.slice(0, codeIndex).trim(),
      code: full.slice(codeIndex).trim(),
      full,
    };
  }
  return { lead: full, code: '', full };
}

/**
 * Reads offer copy and CTA links from fragment markup (legacy paragraphs or `.offer-banner`).
 * @param {Element} wrapper Section content wrapper
 * @returns {{
 *   message: string,
 *   redeemLink: HTMLAnchorElement|undefined,
 *   termsLink: HTMLAnchorElement|undefined
 * }}
 */
function extractOfferFields(wrapper) {
  const offerBanner = wrapper.querySelector('.offer-banner');
  if (offerBanner) {
    const links = [...offerBanner.querySelectorAll('a')];
    const redeemLink = links.find((a) => /redeem/i.test(a.textContent)) || links[0];
    const termsLink = links.find((a) => /terms/i.test(a.textContent)) || links[1];
    const messageHost = offerBanner.querySelector(':scope > div > div') || offerBanner;
    const clone = messageHost.cloneNode(true);
    clone.querySelectorAll('a').forEach((a) => a.remove());
    const message = clone.textContent.replace(/\s+/g, ' ').trim();
    return { message, redeemLink, termsLink };
  }

  const links = [...wrapper.querySelectorAll('a')];
  const redeemLink = links.find((a) => /redeem/i.test(a.textContent)) || links[0];
  const termsLink = links.find((a) => /terms/i.test(a.textContent)) || links[1];
  const message = [...wrapper.querySelectorAll('p')]
    .map((p) => {
      const clone = p.cloneNode(true);
      clone.querySelectorAll('a').forEach((a) => a.remove());
      return clone.textContent.replace(/\s+/g, ' ').trim();
    })
    .find((t) => t) || '';
  return { message, redeemLink, termsLink };
}

/**
 * Builds the lime offer/code bar from an authored offer section.
 * Supports legacy paragraphs or a `.offer-banner` block in the nav fragment.
 * @param {Element} section The authored offer section
 * @returns {Element|null} The offer bar element, or null if already dismissed
 */
function buildOfferBar(section) {
  if (sessionStorage.getItem(OFFER_DISMISS_KEY) === 'true') return null;

  const wrapper = section.querySelector('.default-content-wrapper') || section;
  const { message, redeemLink, termsLink } = extractOfferFields(wrapper);

  const { lead, code, full } = parseOfferMessage(message);

  const bar = document.createElement('div');
  bar.className = 'header-offer';

  const inner = document.createElement('div');
  inner.className = 'header-offer-inner';
  bar.append(inner);

  const cluster = document.createElement('div');
  cluster.className = 'header-offer-cluster';

  const icon = document.createElement('span');
  icon.className = 'header-offer-icon';
  icon.setAttribute('aria-hidden', 'true');
  cluster.append(icon);

  const copy = document.createElement('div');
  copy.className = 'header-offer-copy';

  if (message) {
    const leadText = document.createElement('p');
    leadText.className = 'header-offer-message-lead';
    leadText.textContent = lead || full;
    copy.append(leadText);
  }

  const subrow = document.createElement('div');
  subrow.className = 'header-offer-subrow';

  if (message) {
    const fullText = document.createElement('p');
    fullText.className = 'header-offer-message-full';
    fullText.textContent = full;
    subrow.append(fullText);
  }

  if (code) {
    const codeText = document.createElement('span');
    codeText.className = 'header-offer-code';
    codeText.textContent = code;
    subrow.append(codeText);
  }

  if (redeemLink) {
    redeemLink.className = 'header-offer-redeem';
    subrow.append(redeemLink);
  }

  copy.append(subrow);

  if (termsLink) {
    termsLink.className = 'header-offer-terms';
    copy.append(termsLink);
  }

  cluster.append(copy);
  inner.append(cluster);

  const close = document.createElement('button');
  close.type = 'button';
  close.className = 'header-offer-close';
  close.setAttribute('aria-label', 'Dismiss offer');
  close.addEventListener('click', () => {
    sessionStorage.setItem(OFFER_DISMISS_KEY, 'true');
    document.documentElement.classList.add('header-offer-dismissed');
    bar.remove();
  });
  inner.append(close);

  return bar;
}

/**
 * Builds the "For Everyone / For Leaders" audience toggle (buttons, not links).
 * @returns {Element} The toggle element
 */
function buildAudienceToggle() {
  const leadersPath = rootLink('/leaders');
  // Active state driven by localStorage so it matches the head.html redirect on return visits.
  const isLeader = isLeaderAudience() || window.location.pathname.startsWith(leadersPath);
  const tabs = [
    {
      label: 'For Everyone',
      href: rootLink('/'),
      active: !isLeader,
      onSelect: () => clearAudience(),
    },
    {
      label: 'For Leaders',
      href: leadersPath,
      active: isLeader,
      onSelect: () => setAudience('leader'),
    },
  ];

  const toggle = document.createElement('div');
  toggle.className = 'nav-audience-toggle';
  toggle.setAttribute('role', 'tablist');
  toggle.setAttribute('aria-label', 'Audience');

  tabs.forEach((tab) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'nav-audience-tab';
    button.setAttribute('role', 'tab');
    button.setAttribute('aria-selected', tab.active ? 'true' : 'false');
    if (tab.active) button.classList.add('nav-audience-tab--active');

    const text = document.createElement('span');
    text.className = 'nav-audience-label';
    text.textContent = tab.label;
    button.append(text);

    button.addEventListener('click', () => {
      tab.onSelect();
      toggle.querySelectorAll('.nav-audience-tab').forEach((el) => {
        el.classList.remove('nav-audience-tab--active');
        el.setAttribute('aria-selected', 'false');
      });
      button.classList.add('nav-audience-tab--active');
      button.setAttribute('aria-selected', 'true');
      if (tab.href !== window.location.pathname) {
        window.location.href = tab.href;
      }
    });

    toggle.append(button);
  });

  const experience = document.createElement('div');
  experience.className = 'nav-mobile-experience';

  const heading = document.createElement('p');
  heading.className = 'nav-mobile-experience-label';
  heading.textContent = 'Choose your experience';

  experience.append(heading, toggle);
  return experience;
}

/**
 * Places audience toggle in desktop leading zone or mobile experience section.
 * @param {Element} nav The nav element
 */
function placeAudienceToggle(nav) {
  const experience = nav.querySelector('.nav-mobile-experience');
  const leading = nav.querySelector('.nav-top-leading');
  const audience = nav.querySelector('.nav-audience-toggle');
  if (!experience || !leading || !audience) return;

  if (isDesktop.matches) {
    if (audience.parentElement !== leading) leading.append(audience);
  } else if (audience.parentElement !== experience) {
    experience.append(audience);
  }
}

/**
 * Wraps top-row nav chrome into Figma zones: leading | brand | trailing.
 * @param {Element} nav The nav element
 */
function wrapNavTop(nav) {
  const navTop = document.createElement('div');
  navTop.className = 'nav-top';

  const leading = document.createElement('div');
  leading.className = 'nav-top-leading';

  const trailing = document.createElement('div');
  trailing.className = 'nav-top-trailing';

  const hamburger = nav.querySelector('.nav-hamburger');
  const brand = nav.querySelector('.nav-brand');
  const tools = nav.querySelector('.nav-tools');

  if (hamburger) leading.append(hamburger);

  if (tools) trailing.append(tools);

  navTop.append(leading);
  if (brand) navTop.append(brand);
  navTop.append(trailing);

  nav.prepend(navTop);
}

/**
 * Collapses open mobile accordion panels.
 * @param {Element} navSections The nav sections container
 * @param {Element} [except] Optional section to keep open
 */
function closeMobileAccordions(navSections, except = null) {
  if (!navSections) return;
  navSections.querySelectorAll('.nav-drop.active').forEach((section) => {
    if (section !== except) {
      section.classList.remove('active');
      setNavDropExpanded(section, false);
    }
  });
}

/**
 * Sets up the submenu
 * @param {navSection} navSection The nav section element
 */
function setupSubmenu(navSection) {
  if (navSection.querySelector('ul')) {
    let label;
    if (navSection.childNodes.length) {
      [label] = navSection.childNodes;
    }

    const submenu = navSection.querySelector('ul');
    const wrapper = document.createElement('div');
    const header = subMenuHeader.cloneNode(true);
    const backLink = header.querySelector('.back-link');
    if (backLink) backLink.textContent = label.textContent?.trim() || 'All Categories';
    const title = document.createElement('h6');
    title.classList.add('submenu-title');
    title.textContent = label.textContent;

    wrapper.classList.add('submenu-wrapper', 'accordion-panel');
    wrapper.appendChild(header);
    wrapper.appendChild(title);
    const clonedSubmenu = submenu.cloneNode(true);
    clonedSubmenu.classList.add('accordion-content');
    wrapper.appendChild(clonedSubmenu);

    navSection.appendChild(wrapper);
    navSection.removeChild(submenu);
    setNavDropExpanded(navSection, false);
  }
}

/**
 * loads and decorates the header, mainly the nav
 * @param {Element} block The header block element
 */
export default async function decorate(block) {
  // Render a banner at the top of the page if seller assisted buying session identified
  const sellerAssistedBuyingBanner = await renderSellerAssistedBuyingBanner();
  if (sellerAssistedBuyingBanner && !document.querySelector('.seller-assisted-buying-banner')) {
    document.body.insertAdjacentElement('afterbegin', sellerAssistedBuyingBanner);
  }

  // load nav as fragment
  const navMeta = getMetadata('nav');
  const navPath = navMeta ? new URL(navMeta, window.location).pathname : '/nav';
  const fragment = await loadFragment(navPath);

  // decorate nav DOM
  block.textContent = '';
  const nav = document.createElement('nav');
  nav.id = 'nav';
  nav.setAttribute('aria-label', 'Main navigation');
  while (fragment.firstElementChild) nav.append(fragment.firstElementChild);

  const { offerBar } = classifyNavFragment(nav);

  const navBrand = nav.querySelector('.nav-brand');
  if (!navBrand) {
    // eslint-disable-next-line no-console
    console.warn('header: no brand section found in nav fragment');
  }
  const brandLink = navBrand?.querySelector('.button');
  if (brandLink) {
    brandLink.className = '';
    brandLink.closest('.button-container').className = '';
  }

  // Ensure GS logo SVG is used in the brand link
  if (navBrand) {
    const brandAnchor = navBrand.querySelector('a') || navBrand;
    const existingImg = brandAnchor.querySelector('img');
    if (existingImg) {
      existingImg.src = '/icons/gs-logo.svg';
      existingImg.alt = 'Girl Scouts';
      existingImg.width = 145;
      existingImg.height = 48;
    } else {
      const logoImg = document.createElement('img');
      logoImg.src = '/icons/gs-logo.svg';
      logoImg.alt = 'Girl Scouts';
      logoImg.width = 145;
      logoImg.height = 48;
      brandAnchor.textContent = '';
      brandAnchor.append(logoImg);
    }
  }

  // For Everyone / For Leaders audience toggle (left of the nav bar)
  nav.prepend(buildAudienceToggle());

  let navSections = nav.querySelector('.nav-sections');
  const navApiEndpoint = await getConfigValue('nav-api-endpoint');
  if (navApiEndpoint && navApiEndpoint !== 'false') {
    try {
      const navItems = await fetchNav();
      if (!navSections) {
        navSections = createNavSectionsContainer();
        const insertBefore = nav.querySelector('.nav-tools');
        if (insertBefore) {
          nav.insertBefore(navSections, insertBefore);
        } else {
          nav.append(navSections);
        }
      }
      if (navItems.length) {
        applyApiNavigation(navSections, navItems);
      }
    } catch (error) {
      // eslint-disable-next-line no-console
      console.warn('header: failed to load API navigation', error);
    }
  }

  if (navSections) {
    let hoverTimer;
    navSections
      .querySelectorAll(':scope .default-content-wrapper > ul > li')
      .forEach((navSection) => {
        const topLabel = navSection.querySelector(':scope > p')?.textContent?.trim();
        if (topLabel === 'Account') navSection.classList.add('nav-account-menu');
        if (navSection.querySelector('ul')) navSection.classList.add('nav-drop', 'accordion-item');
        setupSubmenu(navSection);
        setupNavDropLink(navSection, navSections);
        navSection.addEventListener('click', (event) => {
          if (event.target.tagName === 'A') return;
          if (!isDesktop.matches) toggleMobileAccordion(navSections, navSection);
        });
        navSection.addEventListener('mouseenter', () => {
          if (!isDesktop.matches) return;
          clearTimeout(hoverTimer);
          if (!navSection.classList.contains('nav-drop')) {
            hoverTimer = setTimeout(() => closeDesktopMegaMenu(navSections), 200);
            return;
          }
          hoverTimer = setTimeout(() => openDesktopMegaMenu(navSections, navSection), 200);
        });
        navSection.addEventListener('mouseleave', () => {
          clearTimeout(hoverTimer);
        });
      });
  }

  const navTools = nav.querySelector('.nav-tools');
  const navToolIcons = document.createElement('div');
  navToolIcons.className = 'nav-tool-icons';
  navTools.append(navToolIcons);

  /** Search — first in tools row per Figma (2697:345653) */
  const searchLabel = 'Search Products';
  const searchFragment = document.createRange().createContextualFragment(`
  <div class="search-wrapper nav-tools-wrapper">
    <button type="button" class="nav-search-button" aria-label="${searchLabel}">
      <span class="nav-search-row">
        <span class="nav-search-label">${searchLabel}</span>
        <span class="nav-search-icon" aria-hidden="true"></span>
      </span>
      <span class="nav-search-underline" aria-hidden="true"></span>
    </button>
    <div class="nav-search-input nav-search-panel nav-tools-panel">
      <form id="search-bar-form"></form>
      <div class="search-bar-result" style="display: none;"></div>
    </div>
  </div>
  `);
  navTools.prepend(searchFragment);

  const searchPanel = navTools.querySelector('.nav-search-panel');
  const searchButton = navTools.querySelector('.nav-search-button');
  const searchForm = searchPanel.querySelector('#search-bar-form');
  const searchResult = searchPanel.querySelector('.search-bar-result');

  /** Wishlist */
  const wishlist = document.createRange().createContextualFragment(`
     <div class="wishlist-wrapper nav-tools-wrapper">
       <button type="button" class="nav-wishlist-button" aria-label="Wishlist"></button>
       <div class="wishlist-panel nav-tools-panel"></div>
     </div>
   `);

  navToolIcons.append(wishlist);

  const wishlistButton = navTools.querySelector('.nav-wishlist-button');

  const wishlistMeta = getMetadata('wishlist');
  const wishlistPath = wishlistMeta ? new URL(wishlistMeta, window.location).pathname : '/wishlist';

  wishlistButton.addEventListener('click', () => {
    window.location.href = rootLink(wishlistPath);
  });

  /** Mini Cart */
  const excludeMiniCartFromPaths = ['/checkout'];

  const minicart = document.createRange().createContextualFragment(`
     <div class="minicart-wrapper nav-tools-wrapper">
       <button type="button" class="nav-cart-button" aria-label="Cart"></button>
       <div class="minicart-panel nav-tools-panel"></div>
     </div>
   `);

  navToolIcons.append(minicart);

  const minicartPanel = navTools.querySelector('.minicart-panel');

  const cartButton = navTools.querySelector('.nav-cart-button');

  if (excludeMiniCartFromPaths.includes(window.location.pathname)) {
    cartButton.style.display = 'none';
  }

  /**
   * Handles loading states for navigation panels with state management
   *
   * @param {HTMLElement} panel - The panel element to manage loading state for
   * @param {HTMLElement} button - The button that triggers the panel
   * @param {Function} loader - Async function to execute during loading
   */
  async function withLoadingState(panel, button, loader) {
    if (panel.dataset.loaded === 'true' || panel.dataset.loading === 'true') return;

    button.setAttribute('aria-busy', 'true');
    panel.dataset.loading = 'true';

    try {
      await loader();
      panel.dataset.loaded = 'true';
    } finally {
      panel.dataset.loading = 'false';
      button.removeAttribute('aria-busy');

      // Execute pending toggle if exists
      if (panel.dataset.pendingToggle === 'true') {
        // eslint-disable-next-line no-nested-ternary
        const pendingState = panel.dataset.pendingState === 'true' ? true : (panel.dataset.pendingState === 'false' ? false : undefined);

        // Clear pending flags
        panel.removeAttribute('data-pending-toggle');
        panel.removeAttribute('data-pending-state');

        // Execute the pending toggle
        const show = pendingState ?? !panel.classList.contains('nav-tools-panel--show');
        panel.classList.toggle('nav-tools-panel--show', show);
      }
    }
  }

  function togglePanel(panel, state) {
    // If loading is in progress, queue the toggle action
    if (panel.dataset.loading === 'true') {
      // Store the pending toggle action
      panel.dataset.pendingToggle = 'true';
      panel.dataset.pendingState = state !== undefined ? state.toString() : '';
      return;
    }

    const show = state ?? !panel.classList.contains('nav-tools-panel--show');
    panel.classList.toggle('nav-tools-panel--show', show);
  }

  // Lazy loading for mini cart fragment
  async function loadMiniCartFragment() {
    await withLoadingState(minicartPanel, cartButton, async () => {
      const miniCartMeta = getMetadata('mini-cart');
      const miniCartPath = miniCartMeta ? new URL(miniCartMeta, window.location).pathname : '/mini-cart';
      const miniCartFragment = await loadFragment(miniCartPath);
      minicartPanel.append(miniCartFragment.firstElementChild);
    });
  }

  async function toggleMiniCart(state) {
    if (state) {
      await loadMiniCartFragment();
      const { publishShoppingCartViewEvent } = await import('@dropins/storefront-cart/api.js');
      publishShoppingCartViewEvent();
    }

    togglePanel(minicartPanel, state);
  }

  cartButton.addEventListener('click', () => toggleMiniCart(!minicartPanel.classList.contains('nav-tools-panel--show')));

  // Cart Item Counter
  events.on('cart/data', (data) => {
    // preload mini cart fragment if user has a cart
    if (data) loadMiniCartFragment();

    if (data?.totalQuantity) {
      cartButton.setAttribute('data-count', data.totalQuantity);
    } else {
      cartButton.removeAttribute('data-count');
    }
  }, { eager: true });

  async function toggleSearch(state) {
    const pageSize = 4;

    if (state) {
      await withLoadingState(searchPanel, searchButton, async () => {
        await import('../../scripts/initializers/search.js');

        // Load search components in parallel
        const [
          { search },
          { render },
          { SearchResults },
          { provider: UI, Input, Button },
        ] = await Promise.all([
          import('@dropins/storefront-product-discovery/api.js'),
          import('@dropins/storefront-product-discovery/render.js'),
          import('@dropins/storefront-product-discovery/containers/SearchResults.js'),
          import('@dropins/tools/components.js'),
          import('@dropins/tools/lib.js'),
        ]);

        render.render(SearchResults, {
          skeletonCount: pageSize,
          scope: 'popover',
          routeProduct: ({ urlKey, sku }) => getProductLink(urlKey, sku),
          onSearchResult: (results) => {
            searchResult.style.display = results.length > 0 ? 'block' : 'none';
          },
          slots: {
            ProductImage: (ctx) => {
              const { product, defaultImageProps } = ctx;
              const anchorWrapper = document.createElement('a');
              anchorWrapper.href = getProductLink(product.urlKey, product.sku);

              tryRenderAemAssetsImage(ctx, {
                alias: product.sku,
                imageProps: defaultImageProps,
                wrapper: anchorWrapper,
                params: {
                  width: defaultImageProps.width,
                  height: defaultImageProps.height,
                },
              });
            },
            Footer: async (ctx) => {
              // View all results button
              const viewAllResultsWrapper = document.createElement('div');

              const viewAllResultsButton = await UI.render(Button, {
                children: labels.Global?.SearchViewAll,
                variant: 'secondary',
                href: rootLink('/search'),
              })(viewAllResultsWrapper);

              ctx.appendChild(viewAllResultsWrapper);

              ctx.onChange((next) => {
                viewAllResultsButton?.setProps((prev) => ({
                  ...prev,
                  href: `${rootLink('/search')}?q=${encodeURIComponent(next.variables?.phrase || '')}`,
                }));
              });
            },
          },
        })(searchResult);

        searchForm.addEventListener('submit', (e) => {
          e.preventDefault();
          const query = e.target.search.value;
          if (query.length) {
            window.location.href = `${rootLink('/search')}?q=${encodeURIComponent(query)}`;
          }
        });

        UI.render(Input, {
          name: 'search',
          placeholder: labels.Global?.Search,
          onValue: (phrase) => {
            if (!phrase) {
              search(null, { scope: 'popover' });
              return;
            }

            if (phrase.length < 3) {
              return;
            }

            search({
              phrase,
              pageSize,
              filter: [
                { attribute: 'visibility', in: ['Search', 'Catalog, Search'] },
              ],
            }, { scope: 'popover' });
          },
        })(searchForm);
      });
    }

    togglePanel(searchPanel, state);
    if (state) searchForm?.querySelector('input')?.focus();
  }

  searchButton.addEventListener('click', () => toggleSearch(!searchPanel.classList.contains('nav-tools-panel--show')));

  navTools.querySelector('.nav-search-button').addEventListener('click', () => {
    if (isDesktop.matches) {
      closeDesktopMegaMenu(navSections);
    }
  });

  // Close panels when clicking outside
  document.addEventListener('click', (e) => {
    // Check if undo is enabled for mini cart
    const miniCartElement = document.querySelector(
      '[data-block-name="commerce-mini-cart"]',
    );
    const undoEnabled = miniCartElement
      && (miniCartElement.textContent?.includes('undo-remove-item')
        || miniCartElement.innerHTML?.includes('undo-remove-item'));

    // For mini cart: if undo is enabled, be more restrictive about when to close
    const shouldCloseMiniCart = undoEnabled
      ? !minicartPanel.contains(e.target)
      && !cartButton.contains(e.target)
      && !e.target.closest('header')
      : !minicartPanel.contains(e.target) && !cartButton.contains(e.target);

    if (shouldCloseMiniCart) {
      toggleMiniCart(false);
    }

    if (!searchPanel.contains(e.target) && !searchButton.contains(e.target)) {
      toggleSearch(false);
    }
  });

  const navWrapper = document.createElement('div');
  navWrapper.className = 'nav-wrapper';
  navWrapper.append(nav);

  block.append(navWrapper);

  // The wrapper is position:fixed below 1100px, so it no longer reserves space
  // in flow. Mirror its real (wrap-aware) height onto the <header> spacer so the
  // first section never hides behind it. Desktop sizes itself, so clear it there.
  const headerEl = block.closest('header');
  if (headerEl) {
    const syncHeaderHeight = () => {
      if (isDesktop.matches || nav.getAttribute('aria-expanded') === 'true') {
        headerEl.style.removeProperty('min-height');
      } else {
        const h = Math.ceil(navWrapper.getBoundingClientRect().height);
        headerEl.style.minHeight = `${h}px`;
        // Cache no-offer height (offer is always delayed 3 s) for CLS-free pre-paint on next visit.
        if (!navWrapper.querySelector('.header-offer')) {
          try { localStorage.setItem('gs-header-nav-height', `${h}px`); } catch (e) { /* storage unavailable */ }
        }
      }
    };
    syncHeaderHeight();
    new ResizeObserver(syncHeaderHeight).observe(navWrapper);
    isDesktop.addEventListener('change', syncHeaderHeight);
  }

  // Desktop: insert offer bar immediately (position:relative, no CLS concern).
  // Mobile/tablet: delay 3 s so the initial paint and LCP settle before it slides in.
  if (offerBar) {
    if (isDesktop.matches) {
      navWrapper.prepend(offerBar);
    } else {
      setTimeout(() => {
        offerBar.classList.add('header-offer-entering');
        navWrapper.prepend(offerBar);
        offerBar.addEventListener('animationend', () => offerBar.classList.remove('header-offer-entering'), { once: true });
      }, 3000);
    }
  }

  navWrapper.addEventListener('mouseout', (e) => {
    if (isDesktop.matches && !nav.contains(e.relatedTarget)) {
      closeDesktopMegaMenu(navSections);
    }
  });

  window.addEventListener('resize', () => {
    navWrapper.classList.remove('active');
    overlay.classList.remove('show');
    toggleMenu(nav, navSections, false);
    const expandedSection = navSections?.querySelector(':scope .default-content-wrapper > ul > li[aria-expanded="true"]');
    refreshMegaMenuLayout(expandedSection);
  });

  // hamburger for mobile
  const hamburger = document.createElement('div');
  hamburger.classList.add('nav-hamburger');
  hamburger.innerHTML = `<button type="button" aria-controls="nav" aria-label="Open navigation">
      <span class="nav-hamburger-icon"></span>
    </button>`;
  hamburger.addEventListener('click', () => {
    navWrapper.classList.toggle('active');
    overlay.classList.toggle('show');
    toggleMenu(nav, navSections);
  });
  nav.prepend(hamburger);
  wrapNavTop(nav);
  placeAudienceToggle(nav);
  nav.setAttribute('aria-expanded', 'false');
  // prevent mobile nav behavior on window resize
  toggleMenu(nav, navSections, isDesktop.matches);
  isDesktop.addEventListener('change', () => {
    placeAudienceToggle(nav);
    toggleMenu(nav, navSections, isDesktop.matches);
  });

  renderAuthCombine(
    navSections,
    () => !isDesktop.matches && toggleMenu(nav, navSections, false),
  );
  renderAuthDropdown(navToolIcons);

  /** Company Switcher */
  const isAuthenticated = events.lastPayload('authenticated');
  if (isAuthenticated && getConfigValue('commerce-companies-enabled') === true) {
    await (await import('./renderCompanySwitcher.js')).default(navTools);
  }
}
