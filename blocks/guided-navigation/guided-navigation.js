/**
 * Guided Navigation ("I am looking for …")
 *
 * Authoring:
 * - Each row that contains a link becomes a dropdown option (text = label,
 *   href = destination). Selecting an option + the button navigates there.
 * - Optional config rows let authors override the static strings:
 *     | Label  | I am looking for |
 *     | Button | Go              |
 *   (a two-cell row whose first cell is "label" or "button").
 *
 * The dropdown is a custom ARIA combobox (Figma 2994:99493): a trigger that
 * shows the selected option, opening a listbox of the authored options. Fully
 * keyboard- and screen-reader-driven.
 */
const DEFAULTS = {
  label: 'I am looking for',
  button: 'Go',
};

let comboCount = 0;

export default function decorate(block) {
  const rows = [...block.children];
  const config = { ...DEFAULTS };
  const links = [];

  rows.forEach((row) => {
    const link = row.querySelector('a[href]');
    if (link) {
      links.push({
        href: link.getAttribute('href'),
        text: (link.textContent || '').trim(),
      });
      return;
    }
    // Config row: first cell = key, second cell = value.
    const cells = [...row.children];
    const key = (cells[0]?.textContent || '').trim().toLowerCase();
    const value = (cells[1]?.textContent || '').trim();
    if (key && value && key in config) config[key] = value;
  });

  comboCount += 1;
  const uid = `guided-navigation-${comboCount}`;
  const listId = `${uid}-list`;

  const label = document.createElement('span');
  label.className = 'guided-navigation-label';
  label.id = `${uid}-label`;
  label.textContent = config.label;

  // ----- Combobox shell -----
  const combo = document.createElement('div');
  combo.className = 'guided-navigation-combo';

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'guided-navigation-trigger';
  trigger.setAttribute('aria-haspopup', 'listbox');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', listId);
  trigger.setAttribute('aria-labelledby', `${label.id} ${uid}-value`);

  const triggerText = document.createElement('span');
  triggerText.className = 'guided-navigation-trigger-text';
  triggerText.id = `${uid}-value`;
  trigger.append(triggerText);

  const panel = document.createElement('div');
  panel.className = 'guided-navigation-panel';
  panel.hidden = true;

  const list = document.createElement('ul');
  list.className = 'guided-navigation-list';
  list.id = listId;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', config.label);

  const options = links.map((link, i) => {
    const li = document.createElement('li');
    li.className = 'guided-navigation-option';
    li.id = `${uid}-option-${i}`;
    li.setAttribute('role', 'option');
    li.dataset.href = link.href;
    li.textContent = link.text;
    list.append(li);
    return li;
  });

  panel.append(list);
  combo.append(trigger, panel);

  const go = document.createElement('button');
  go.type = 'button';
  go.className = 'guided-navigation-go button';
  go.textContent = config.button;

  // ----- State -----
  let selectedIndex = links.length ? 0 : -1;
  let activeIndex = -1; // highlighted while navigating with the keyboard

  const setSelected = (i) => {
    if (i < 0 || i >= options.length) return;
    selectedIndex = i;
    triggerText.textContent = links[i].text;
    options.forEach((o, idx) => o.setAttribute('aria-selected', String(idx === i)));
  };

  const setActive = (i) => {
    activeIndex = i;
    options.forEach((o) => o.classList.remove('is-active'));
    if (i >= 0 && options[i]) {
      options[i].classList.add('is-active');
      trigger.setAttribute('aria-activedescendant', options[i].id);
      options[i].scrollIntoView({ block: 'nearest' });
    } else {
      trigger.removeAttribute('aria-activedescendant');
    }
  };

  const openPanel = () => {
    if (!panel.hidden) return;
    panel.hidden = false;
    trigger.setAttribute('aria-expanded', 'true');
    setActive(selectedIndex >= 0 ? selectedIndex : 0);
  };

  const closePanel = ({ focusTrigger = false } = {}) => {
    if (panel.hidden) return;
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    setActive(-1);
    if (focusTrigger) trigger.focus();
  };

  const commitActive = () => {
    if (activeIndex >= 0) {
      setSelected(activeIndex);
      closePanel({ focusTrigger: true });
    }
  };

  const moveActive = (dir) => {
    if (!options.length) return;
    let next = activeIndex + dir;
    if (next < 0) next = options.length - 1;
    if (next >= options.length) next = 0;
    setActive(next);
  };

  // ----- Events -----
  trigger.addEventListener('click', () => {
    if (panel.hidden) openPanel();
    else closePanel({ focusTrigger: true });
  });

  trigger.addEventListener('keydown', (e) => {
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (panel.hidden) openPanel();
        else moveActive(1);
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (panel.hidden) openPanel();
        else moveActive(-1);
        break;
      case 'Enter':
      case ' ':
        if (!panel.hidden) {
          e.preventDefault();
          commitActive();
        }
        break;
      case 'Escape':
        if (!panel.hidden) {
          e.preventDefault();
          closePanel({ focusTrigger: true });
        }
        break;
      default:
        break;
    }
  });

  options.forEach((opt, i) => {
    opt.addEventListener('click', () => {
      setSelected(i);
      closePanel({ focusTrigger: true });
    });
    opt.addEventListener('mousemove', () => setActive(i));
  });

  // Close when focus/click leaves the combobox.
  document.addEventListener('click', (e) => {
    if (!combo.contains(e.target)) closePanel();
  });

  go.addEventListener('click', () => {
    const target = options[selectedIndex]?.dataset.href;
    if (target) window.location.assign(target);
  });

  // Initialise selection (first option by default).
  if (selectedIndex >= 0) setSelected(selectedIndex);
  else triggerText.textContent = config.label;

  block.replaceChildren(label, combo, go);
}
