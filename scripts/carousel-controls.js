/**
 * Reusable carousel controls — the dot pager + prev/next arrows shared by
 * slider blocks (shop-by-collection, stories-testimonials, …).
 *
 * It builds the DOM and wires accessibility/active-state only; it is NOT a
 * slider engine. Each block keeps its own navigation mechanism (scroll track,
 * coverflow, crossfade, …) and just calls `setActive()` / `setArrowsDisabled()`
 * and supplies the click callbacks.
 *
 * Class names follow the caller's block prefix so existing CSS keeps working:
 *   {prefix}-arrow {prefix}-arrow-prev|next
 *   {prefix}-dots > ol > li > button.{prefix}-dot
 *
 * @param {object} opts
 * @param {string} opts.prefix      Block class prefix, e.g. 'shop-by-collection'.
 * @param {number} opts.count       Number of slides.
 * @param {string} [opts.controls]  id of the element the controls operate (aria-controls).
 * @param {string} [opts.label]     aria-label for the dots nav.
 * @param {string} [opts.itemNoun]  Noun for dot labels: "Go to {noun} {n} of {count}".
 * @param {string} [opts.prevLabel] aria-label for the prev arrow.
 * @param {string} [opts.nextLabel] aria-label for the next arrow.
 * @param {boolean}[opts.loop]      Ring distance for the dot taper (infinite carousels).
 * @param {(i:number)=>void} [opts.onSelect] Dot click handler.
 * @param {()=>void} [opts.onPrev]  Prev arrow click handler.
 * @param {()=>void} [opts.onNext]  Next arrow click handler.
 * @param {object}  [opts.autoplay] Opt-in autoplay. When present, advances on a
 *   timer by invoking onTick (defaults to onNext). Honors prefers-reduced-motion
 *   and pauses on hover/focus of `root` and while the tab is hidden. This is NOT
 *   a slider engine — it just re-fires the caller's navigation callback.
 * @param {number} [opts.autoplay.interval=6000] Milliseconds between advances.
 * @param {HTMLElement} [opts.autoplay.root]     Element watched for hover/focus pause.
 * @param {boolean}[opts.autoplay.pauseOnHover=true] Pause while pointer is over root.
 * @param {boolean}[opts.autoplay.pauseOnFocus=true] Pause while focus is within root.
 * @param {()=>void}[opts.autoplay.onTick]      Advance callback; defaults to onNext.
 * @returns {{prev:HTMLButtonElement, next:HTMLButtonElement, dotsNav:HTMLElement,
 *            dots:HTMLButtonElement[], setActive:(i:number)=>void,
 *            setArrowsDisabled:(p:boolean, n:boolean)=>void,
 *            startAutoplay:()=>void, stopAutoplay:()=>void}}
 */
export default function createCarouselControls({
  prefix,
  count,
  controls,
  label = 'Slide controls',
  itemNoun = 'slide',
  prevLabel = 'Previous',
  nextLabel = 'Next',
  loop = false,
  onSelect,
  onPrev,
  onNext,
  autoplay,
} = {}) {
  // ----- Arrows -----
  const makeArrow = (dir, ariaLabel, handler) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `${prefix}-arrow ${prefix}-arrow-${dir}`;
    btn.setAttribute('aria-label', ariaLabel);
    if (controls) btn.setAttribute('aria-controls', controls);
    if (handler) btn.addEventListener('click', handler);
    return btn;
  };
  const prev = makeArrow('prev', prevLabel, onPrev);
  const next = makeArrow('next', nextLabel, onNext);

  // ----- Dots -----
  const dotsNav = document.createElement('nav');
  dotsNav.className = `${prefix}-dots`;
  dotsNav.setAttribute('aria-label', label);
  const dotList = document.createElement('ol');
  const dots = Array.from({ length: count }, (unused, i) => {
    const li = document.createElement('li');
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.className = `${prefix}-dot`;
    dot.setAttribute('aria-label', `Go to ${itemNoun} ${i + 1} of ${count}`);
    dot.dataset.target = String(i);
    if (onSelect) dot.addEventListener('click', () => onSelect(i));
    li.append(dot);
    dotList.append(li);
    return dot;
  });
  dotsNav.append(dotList);

  // Distance from active for the dynamic taper. Ring-aware when looping so the
  // taper is symmetric across the wrap point; capped at 3 (smallest dot size).
  const distance = (i, active) => {
    let d = Math.abs(i - active);
    if (loop) d = Math.min(d, count - d);
    return Math.min(d, 3);
  };

  const setActive = (active) => {
    dots.forEach((d, i) => {
      if (i === active) d.setAttribute('aria-current', 'true');
      else d.removeAttribute('aria-current');
      d.dataset.distance = String(distance(i, active));
    });
  };

  const setArrowsDisabled = (prevDisabled, nextDisabled) => {
    prev.disabled = !!prevDisabled;
    next.disabled = !!nextDisabled;
  };

  // ----- Autoplay (opt-in) -----
  // A timer that re-fires the caller's advance callback; still block-owned
  // navigation, just driven on an interval. Skipped entirely when the visitor
  // prefers reduced motion.
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let autoplayTimer = null;
  let autoplayPaused = false;

  const startAutoplay = () => {
    if (!autoplay || reduceMotion || autoplayPaused || autoplayTimer !== null) return;
    const tick = autoplay.onTick || onNext;
    if (!tick) return;
    autoplayTimer = window.setInterval(tick, autoplay.interval || 6000);
  };
  const stopAutoplay = () => {
    if (autoplayTimer !== null) {
      window.clearInterval(autoplayTimer);
      autoplayTimer = null;
    }
  };

  if (autoplay && !reduceMotion) {
    const { root, pauseOnHover = true, pauseOnFocus = true } = autoplay;
    const pause = () => { autoplayPaused = true; stopAutoplay(); };
    const resume = () => { autoplayPaused = false; startAutoplay(); };
    if (root && pauseOnHover) {
      root.addEventListener('mouseenter', pause);
      root.addEventListener('mouseleave', resume);
    }
    if (root && pauseOnFocus) {
      root.addEventListener('focusin', pause);
      root.addEventListener('focusout', resume);
    }
    // Pause while the tab is backgrounded so slides don't race by unseen.
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) stopAutoplay();
      else startAutoplay();
    });
    startAutoplay();
  }

  return {
    prev,
    next,
    dotsNav,
    dots,
    setActive,
    setArrowsDisabled,
    startAutoplay,
    stopAutoplay,
  };
}
