import { getMetadata, readBlockConfig } from '../../scripts/aem.js';
import { rootLink } from '../../scripts/commerce.js';
import { loadFragment } from '../fragment/fragment.js';

const FOOTER_LOGO = {
  width: 126,
  height: 42,
  alt: 'Girl Scouts',
  homeLabel: 'Girl Scouts home',
  fallbackSrc: '/icons/gs-logo-white.svg',
};

/** Maps Section Metadata Style classes to internal section kinds. */
const FOOTER_SECTION_STYLES = {
  'footer-brand': 'brand',
  'footer-nav': 'nav',
  'footer-promo': 'promo',
  'footer-wholesale': 'wholesale',
  'footer-legal': 'legal',
};

let footerColumnIndex = 0;

/**
 * Returns the default-content wrapper for a fragment section.
 * @param {Element} section A .section element
 * @returns {Element}
 */
function getSectionContent(section) {
  return section.querySelector('.default-content-wrapper') || section;
}

/**
 * Resolves an authored href for same-origin paths via rootLink (locale-aware).
 * @param {string} [href]
 * @returns {string}
 */
function resolveFooterLink(href) {
  if (!href) return rootLink('/');
  try {
    const url = new URL(href, window.location.origin);
    if (url.origin !== window.location.origin) return href;
    return `${rootLink(url.pathname)}${url.search}${url.hash}`;
  } catch {
    return href;
  }
}

/**
 * Applies standard footer logo dimensions and alt text to an img.
 * @param {HTMLImageElement} img
 */
function applyFooterLogoImg(img) {
  if (!img.alt) img.alt = FOOTER_LOGO.alt;
  img.width = FOOTER_LOGO.width;
  img.height = FOOTER_LOGO.height;
  if (!img.getAttribute('loading')) img.loading = 'lazy';
}

/**
 * Reads footer section kind from Section Metadata (class or block), if present.
 * @param {Element} section A .section element
 * @returns {('brand'|'nav'|'promo'|'wholesale'|'legal'|null)}
 */
function readSectionStyle(section) {
  const fromClass = Object.entries(FOOTER_SECTION_STYLES)
    .find(([className]) => section.classList.contains(className));
  if (fromClass) return fromClass[1];

  const metadataBlock = section.querySelector('.section-metadata');
  if (metadataBlock) {
    const { style } = readBlockConfig(metadataBlock);
    if (style && FOOTER_SECTION_STYLES[style]) return FOOTER_SECTION_STYLES[style];
  }

  return null;
}

/**
 * Tests whether a content list represents the social-media links.
 * @param {Element} list A <ul> element
 * @returns {boolean}
 */
function isSocialList(list) {
  if (!list) return false;
  if (list.querySelector('.icon')) return true;
  return [...list.querySelectorAll('a')].some((a) => {
    const href = (a.getAttribute('href') || '').toLowerCase();
    return ['facebook', 'instagram', 'youtube', 'linkedin', 'whatsapp', 'twitter', 'x.com']
      .some((s) => href.includes(s));
  });
}

/**
 * Builds an accordion column from a heading + list pair.
 * @param {Element} heading The column heading
 * @param {Element} list The column's <ul>
 * @param {boolean} expanded Whether the column starts expanded
 * @returns {Element} The .footer-column element
 */
function buildColumn(heading, list, expanded) {
  footerColumnIndex += 1;
  const listId = `footer-column-list-${footerColumnIndex}`;

  const column = document.createElement('div');
  column.className = 'footer-column accordion-item';

  const title = document.createElement('h2');
  title.className = 'footer-column-title';
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = heading.textContent;
  button.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  button.setAttribute('aria-controls', listId);
  button.classList.add('accordion-trigger');
  title.append(button);
  column.append(title);

  list.id = listId;
  list.classList.add('footer-column-list', 'accordion-content');
  const panel = document.createElement('div');
  panel.className = 'footer-column-panel accordion-panel';
  panel.append(list);
  column.append(panel);

  button.addEventListener('click', () => {
    const isOpen = button.getAttribute('aria-expanded') === 'true';
    if (!isOpen) {
      column.closest('.footer-nav-group, .footer-nav-primary, .footer-nav-secondary, .footer-nav')
        ?.querySelectorAll('.accordion-trigger[aria-expanded="true"]')
        .forEach((other) => { if (other !== button) other.setAttribute('aria-expanded', 'false'); });
    }
    button.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
  });

  return column;
}

/**
 * Builds the social column. Icons are already decorated by the fragment loader;
 * this only wires up classes and accessible labels.
 * @param {Element} heading The "Follow Us On" heading
 * @param {Element} list The social <ul>
 * @returns {Element} The social .footer-column element
 */
function buildSocialColumn(heading, list) {
  const column = document.createElement('div');
  column.className = 'footer-column footer-column--social';

  const title = document.createElement('h2');
  title.className = 'footer-column-title';
  title.textContent = heading.textContent;
  column.append(title);

  list.classList.add('footer-social');
  list.querySelectorAll('a').forEach((a) => {
    if (a.getAttribute('aria-label')) return;
    const icon = a.querySelector('.icon');
    const name = icon ? [...icon.classList].find((c) => c.startsWith('icon-')) : '';
    a.setAttribute('aria-label', name ? name.replace('icon-', '') : a.textContent.trim());
  });
  column.append(list);

  return column;
}

/**
 * Splits a navigation section into ordered { heading, list } column groups.
 * @param {Element} section The nav .section element
 * @returns {Array<{heading: Element, list: Element}>}
 */
function readColumns(section) {
  const wrapper = getSectionContent(section);
  const groups = [];
  let heading = null;
  [...wrapper.children].forEach((node) => {
    if (/^H[1-6]$/.test(node.tagName)) {
      heading = node;
    } else if (node.tagName === 'UL' && heading) {
      groups.push({ heading, list: node });
      heading = null;
    }
  });
  return groups;
}

/**
 * Builds the brand logo link from the authored brand section.
 * Supports an uploaded picture/img or :gs-logo-*: icon notation (same as social icons).
 * Falls back to the repo white logo SVG when no brand content is authored.
 * @param {Element} [section] The brand .section element
 * @returns {Element} The .footer-brand anchor
 */
function buildBrand(section) {
  const logoLink = document.createElement('a');
  logoLink.className = 'footer-brand';
  logoLink.href = rootLink('/');
  logoLink.setAttribute('aria-label', FOOTER_LOGO.homeLabel);

  if (section) {
    const wrapper = getSectionContent(section);
    const linkWithLogo = [...wrapper.querySelectorAll('a[href]')].find(
      (a) => a.querySelector('picture, img, .icon'),
    );
    let logoNode = null;

    if (linkWithLogo) {
      logoLink.href = resolveFooterLink(linkWithLogo.getAttribute('href'));
      logoNode = linkWithLogo.querySelector('picture')
        || linkWithLogo.querySelector('.icon[class*="gs-logo"] img')
        || linkWithLogo.querySelector('.icon img')
        || linkWithLogo.querySelector('img');
    } else {
      logoNode = wrapper.querySelector('picture')
        || wrapper.querySelector('.icon[class*="gs-logo"] img')
        || wrapper.querySelector('img:not([data-icon-name])');
    }

    if (logoNode) {
      if (logoNode.tagName === 'IMG') applyFooterLogoImg(logoNode);
      logoLink.append(logoNode);
      return logoLink;
    }
  }

  const logo = document.createElement('img');
  logo.src = `${window.hlx.codeBasePath}${FOOTER_LOGO.fallbackSrc}`;
  applyFooterLogoImg(logo);
  logoLink.append(logo);
  return logoLink;
}

/**
 * Builds the promo card from its section.
 * @param {Element} section The promo .section element
 * @returns {Element}
 */
function buildPromo(section) {
  const card = document.createElement('div');
  card.className = 'footer-promo';

  const picture = section.querySelector('picture');
  if (picture) card.append(picture);

  const body = document.createElement('div');
  body.className = 'footer-promo-body';

  const heading = section.querySelector('h1, h2, h3, h4, h5, h6');
  if (heading) {
    const h = document.createElement('h2');
    h.textContent = heading.textContent;
    body.append(h);
  }

  section.querySelectorAll('p').forEach((p) => {
    if (p.querySelector('picture')) return;
    const cta = p.querySelector('a');
    if (cta) {
      cta.className = 'footer-promo-cta';
      body.append(cta);
    } else if (p.textContent.trim()) {
      body.append(p);
    }
  });

  card.append(body);
  return card;
}

/**
 * Builds the wholesale message box from its section.
 * @param {Element} section The wholesale .section element
 * @returns {Element}
 */
function buildWholesale(section) {
  const box = document.createElement('div');
  box.className = 'footer-wholesale';
  [...getSectionContent(section).children].forEach((node) => box.append(node));
  return box;
}

/**
 * Builds the legal bar (legal links + copyright) from its section.
 * @param {Element} section The legal .section element
 * @returns {Element}
 */
function buildLegal(section) {
  const legal = document.createElement('div');
  legal.className = 'footer-legal';

  const links = [...section.querySelectorAll('a')];
  if (links.length) {
    const list = document.createElement('ul');
    list.className = 'footer-legal-links';
    links.forEach((a) => {
      const li = document.createElement('li');
      li.append(a);
      list.append(li);
    });
    legal.append(list);
  }

  const copyright = [...section.querySelectorAll('p')]
    .find((p) => /©/.test(p.textContent));
  if (copyright) {
    copyright.className = 'footer-copyright';
    legal.append(copyright);
  }

  return legal;
}

/**
 * Classifies a fragment section by Section Metadata Style when present, otherwise
 * by content heuristics. Must be called before any section is mutated.
 * @param {Element} section A .section element
 * @returns {('brand'|'nav'|'promo'|'wholesale'|'legal')}
 */
function classify(section) {
  const fromStyle = readSectionStyle(section);
  if (fromStyle) return fromStyle;

  const hasHeading = !!section.querySelector('h1, h2, h3, h4, h5, h6');
  const hasList = !!section.querySelector('ul');
  const hasPicture = !!section.querySelector('picture');
  const hasLogoIcon = !!section.querySelector('.icon[class*="gs-logo"]');
  const hasLinks = !!section.querySelector('a');
  const text = section.textContent;

  if (hasHeading && hasList) return 'nav';
  if (hasPicture && hasHeading) return 'promo';
  if (hasPicture || (hasLogoIcon && !hasHeading && !hasList)) return 'brand';
  if (/wholesale|login/i.test(text)) return 'wholesale';
  if (text.includes('©') || hasLinks) return 'legal';
  return 'wholesale';
}

/**
 * loads and decorates the footer
 * @param {Element} block The footer block element
 */
export default async function decorate(block) {
  footerColumnIndex = 0;

  const footerMeta = getMetadata('footer');
  const footerPath = footerMeta ? new URL(footerMeta, window.location).pathname : '/footer';
  const fragment = await loadFragment(footerPath);

  block.textContent = '';
  if (!fragment) return;

  const footer = document.createElement('div');
  footer.className = 'footer-content';

  // Classify every section up front — building columns moves content out of
  // sections, which would corrupt a later re-classification.
  // find() returns the first section of each kind when multiples exist.
  const sections = [...fragment.querySelectorAll(':scope > .section')]
    .map((section) => ({ section, kind: classify(section) }));
  const find = (kind) => sections.find((s) => s.kind === kind)?.section;

  footer.append(buildBrand(find('brand')));

  // Navigation columns
  const navSection = find('nav');
  if (navSection) {
    const nav = document.createElement('nav');
    nav.className = 'footer-nav';
    nav.setAttribute('aria-label', 'Footer');
    const navPrimary = document.createElement('div');
    navPrimary.className = 'footer-nav-primary';
    const navSecondary = document.createElement('div');
    navSecondary.className = 'footer-nav-secondary';

    readColumns(navSection).forEach(({ heading, list }, index) => {
      const target = index < 3 ? navPrimary : navSecondary;
      target.append(
        isSocialList(list)
          ? buildSocialColumn(heading, list)
          : buildColumn(heading, list, index === 0),
      );
    });

    if (navPrimary.children.length) nav.append(navPrimary);
    if (navSecondary.children.length) nav.append(navSecondary);
    footer.append(nav);
  }

  // Aside: promo card + wholesale box
  const aside = document.createElement('div');
  aside.className = 'footer-aside';
  const promoSection = find('promo');
  const wholesaleSection = find('wholesale');
  if (promoSection) aside.append(buildPromo(promoSection));
  if (wholesaleSection) aside.append(buildWholesale(wholesaleSection));
  if (aside.children.length) footer.append(aside);

  // Legal bar
  const legalSection = find('legal');
  if (legalSection) footer.append(buildLegal(legalSection));

  block.append(footer);
}
