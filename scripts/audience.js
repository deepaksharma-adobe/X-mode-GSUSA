/**
 * Audience preference helpers — backed by localStorage so the choice persists
 * across browser sessions. The key is intentionally short and namespaced.
 *
 * Consumers:
 *  - head.html  (inline sync script — reads the raw key directly, no import)
 *  - blocks/header/header.js  (imports these helpers)
 */

const AUDIENCE_KEY = 'gs-audience';
const LEADER_VALUE = 'leader';

/**
 * Returns the stored audience value, or null if none is set.
 * @returns {'leader'|null}
 */
export function getAudience() {
  try {
    return localStorage.getItem(AUDIENCE_KEY);
  } catch {
    return null;
  }
}

/**
 * Stores the audience preference.
 * @param {'leader'} value
 */
export function setAudience(value) {
  try {
    localStorage.setItem(AUDIENCE_KEY, value);
  } catch {
    // localStorage unavailable (private mode, storage full, etc.)
  }
}

/**
 * Removes the audience preference — user returns to the default experience.
 */
export function clearAudience() {
  try {
    localStorage.removeItem(AUDIENCE_KEY);
  } catch {
    // localStorage unavailable
  }
}

/**
 * Returns true if the stored audience is 'leader'.
 * @returns {boolean}
 */
export function isLeaderAudience() {
  return getAudience() === LEADER_VALUE;
}

export { AUDIENCE_KEY, LEADER_VALUE };
