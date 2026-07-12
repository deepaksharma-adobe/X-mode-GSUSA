import { loadCSS, readBlockConfig } from '../aem.js';

const POSITIONS = ['top', 'bottom'];
const SHAPES = ['standard', 'shallow'];
const CURVES = ['peak-left', 'peak-right'];

/** Normalize an authored opacity ("6%", "6", "0.06") to a CSS percentage. */
function normalizeOpacity(value) {
  const raw = String(value || '').trim();
  if (!raw) return '';
  if (raw.endsWith('%')) return raw;
  const n = parseFloat(raw);
  if (Number.isNaN(n)) return '';
  return n <= 1 ? `${n * 100}%` : `${n}%`;
}

/**
 * Build a decorative wave element (does not insert it).
 * @param {object} [options]
 * @param {'top'|'bottom'} [options.position]
 * @param {'standard'|'shallow'} [options.shape]
 * @param {'peak-left'|'peak-right'} [options.curve]
 * @param {string} [options.color] any CSS colour
 * @param {string} [options.opacity] optional opacity applied to color
 * @param {Array<{el:Element, alt?:string, side?:'left'|'right'}>} [options.illustrations]
 * @returns {HTMLElement}
 */
export function buildWave(options = {}) {
  loadCSS(`${window.hlx.codeBasePath}/scripts/wave/wave.css`);

  const position = POSITIONS.includes(options.position) ? options.position : 'top';
  const shape = SHAPES.includes(options.shape) ? options.shape : 'standard';
  const curve = CURVES.includes(options.curve) ? options.curve : 'peak-left';

  const wave = document.createElement('div');
  wave.className = 'wave';
  wave.classList.add(`wave--${position}`, `wave--shape-${shape}`, `wave--${curve}`);

  // Colour — any CSS colour, with optional opacity
  const color = (options.color || '').trim();
  const opacity = normalizeOpacity(options.opacity);
  let waveColor = color;
  if (color && opacity) waveColor = `color-mix(in srgb, ${color} ${opacity}, transparent)`;
  if (waveColor && window.CSS?.supports?.('color', waveColor)) {
    wave.style.setProperty('--wave-color', waveColor);
  }

  const shapeEl = document.createElement('span');
  shapeEl.className = 'wave__shape';
  shapeEl.setAttribute('aria-hidden', 'true');
  wave.append(shapeEl);

  const illustrations = (options.illustrations || []).filter((i) => i && i.el);
  if (illustrations.length) {
    const inner = document.createElement('div');
    inner.className = 'wave__inner';
    illustrations.forEach(({
      el, alt = '', side = 'right', animate = false,
    }) => {
      const figure = document.createElement('span');
      figure.className = `wave__icon wave__icon--${side === 'left' ? 'left' : 'right'}`;
      // Fade-in is automatic; the authoring toggle only adds the continuous float
      if (animate) figure.classList.add('wave__icon--float');
      const img = el.tagName === 'IMG' ? el : el.querySelector('img');
      if (img) img.setAttribute('alt', alt);
      if (!alt) figure.setAttribute('aria-hidden', 'true');
      figure.append(el);
      inner.append(figure);
    });
    wave.append(inner);

    // Fade the illustrations in when the wave scrolls into view (progressive
    // enhancement — without IntersectionObserver they simply show, no animation)
    if ('IntersectionObserver' in window) {
      wave.classList.add('wave--reveal');
      requestAnimationFrame(() => {
        const io = new IntersectionObserver((entries, obs) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in-view');
            obs.unobserve(entry.target);
          });
        }, { threshold: 0.25 });
        io.observe(wave);
      });
    }
  }

  return wave;
}

/**
 * Read wave options from a block's key/value config rows (consistent authoring
 * across blocks): "Wave position", "Wave shape", "Wave curve", "Wave color",
 * "Wave opacity".
 * @param {Element} block
 * @returns {object} options for buildWave (illustrations not included)
 */
export function readWaveConfig(block) {
  const config = readBlockConfig(block);
  return {
    position: config['wave-position'],
    shape: config['wave-shape'],
    curve: config['wave-curve'],
    color: config['wave-color'],
    opacity: config['wave-opacity'],
  };
}

// Row labels → which illustration slot + property they set. Both the long form
// ("Illustration Left Animate") and the short form ("Left animate") are accepted.
export const ILLUSTRATION_KEYS = {
  illustration: ['right', 'el'],
  'illustration alt': ['right', 'alt'],
  'illustration animate': ['right', 'animate'],
  animate: ['right', 'animate'],
  'illustration left': ['left', 'el'],
  'illustration left alt': ['left', 'alt'],
  'illustration left animate': ['left', 'animate'],
  'left alt': ['left', 'alt'],
  'left animate': ['left', 'animate'],
  'illustration right': ['right', 'el'],
  'illustration right alt': ['right', 'alt'],
  'illustration right animate': ['right', 'animate'],
  'right alt': ['right', 'alt'],
  'right animate': ['right', 'animate'],
};

export const ON_VALUES = new Set(['on', 'yes', 'true', '1']);

/**
 * Scan a container block's rows for illustration config (any position). Supports a left
 * and/or right illustration via rows labelled "Illustration [Left|Right]" (+ "… Alt").
 * Missing/partial config is fine — returns whatever was found.
 * @param {Element[]} rows
 * @param {{ threeColumn?: boolean }} [options]
 *   threeColumn: true for Document Authoring tables where config rows have an empty
 *   second cell and the value lives in the third cell.
 * @returns {{ illustrations: Array<object>, configRows: Set<Element> }}
 */
export function extractIllustrations(rows, { threeColumn = false } = {}) {
  // animate defaults to false; authors opt in per illustration via an "Animate" row
  const makeSlot = () => ({
    el: null,
    alt: '',
    animate: false,
  });
  const slots = { left: makeSlot(), right: makeSlot() };
  const configRows = new Set();

  rows.forEach((row) => {
    const cells = [...row.children];
    const key = cells[0]?.textContent.trim().toLowerCase();
    const target = ILLUSTRATION_KEYS[key];
    if (!target) return;
    const [side, prop] = target;
    // DA 3-column tables: key | <empty> | value — fall back to cells[2] when cells[1] is blank
    const valueCell = (threeColumn && cells.length >= 3 && !cells[1]?.textContent.trim())
      ? cells[2] : cells[1];
    const value = valueCell?.textContent.trim() || '';
    if (prop === 'el') {
      const img = valueCell?.querySelector('picture, img');
      if (img) slots[side].el = img.closest('picture') || img;
    } else if (prop === 'animate') {
      slots[side].animate = ON_VALUES.has(value.toLowerCase());
    } else {
      slots[side].alt = value;
    }
    configRows.add(row);
  });

  const illustrations = [];
  ['left', 'right'].forEach((side) => {
    if (slots[side].el) illustrations.push({ ...slots[side], side });
  });
  return { illustrations, configRows };
}

/**
 * Build a wave and insert it into the target (prepended for top, appended for bottom).
 * @param {Element} target
 * @param {object} [options] see buildWave
 * @returns {HTMLElement} the wave element
 */
export function decorateWave(target, options = {}) {
  const wave = buildWave(options);
  if (options.position === 'bottom') target.append(wave);
  else target.prepend(wave);
  return wave;
}
