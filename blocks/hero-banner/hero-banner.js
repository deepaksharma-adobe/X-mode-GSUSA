function styleAsOutlined(link) {
  link.classList.remove('primary', 'secondary', 'accent', 'text', 'white', 'hero-banner-explore');
  link.classList.add('secondary', 'light');
}

function styleAsTextLink(link) {
  link.classList.remove('primary', 'secondary', 'accent', 'light');
  link.classList.add('text', 'white', 'hero-banner-explore');
}

function styleAsSolidWhite(link) {
  link.classList.remove('primary', 'secondary', 'accent', 'text', 'light', 'hero-banner-explore');
  link.classList.add('white-on-dark', 'hero-banner-cta');
}

function buttonize(content, solidCta) {
  const links = [...content.querySelectorAll('a[href]')];
  links.forEach((link, idx) => {
    const wrapper = link.closest('p') || link.parentElement;
    wrapper.classList.add('hero-banner-button-wrapper');
    link.classList.add('button');

    // Style is driven by author formatting (set by global decorateButtons):
    // bold link -> .primary, italic link -> .secondary.
    const fromBold = link.classList.contains('primary');
    const fromItalic = link.classList.contains('secondary');

    // Secondary variant: the primary CTA is a solid white button; a second
    // link (if any) falls back to a text link.
    if (solidCta) {
      if (idx === 0 && !fromItalic) styleAsSolidWhite(link);
      else styleAsTextLink(link);
      return;
    }

    // Default: bold -> outlined, italic -> text link; plain links fall back to
    // position (1st outlined, 2nd text link).
    if (fromBold) {
      styleAsOutlined(link);
    } else if (fromItalic) {
      styleAsTextLink(link);
    } else if (idx === 0) {
      styleAsOutlined(link);
    } else {
      styleAsTextLink(link);
    }
  });

  const wrappers = content.querySelectorAll('.hero-banner-button-wrapper');
  if (wrappers.length > 1) {
    const group = document.createElement('div');
    group.classList.add('hero-banner-buttons');
    wrappers[0].before(group);
    wrappers.forEach((wrapper) => group.append(wrapper));
  }
}

function createSoundToggle(video) {
  // Bottom-right mute/unmute control. Video autoplays muted; the visitor can
  // opt into sound. Label/state reflect the action the button will perform.
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('hero-banner-sound');
  button.dataset.muted = 'true';
  button.setAttribute('aria-label', 'Unmute video');
  button.setAttribute('aria-pressed', 'false');

  button.addEventListener('click', () => {
    video.muted = !video.muted;
    const { muted } = video;
    button.dataset.muted = String(muted);
    button.setAttribute('aria-pressed', String(!muted));
    button.setAttribute('aria-label', muted ? 'Unmute video' : 'Mute video');
    if (!muted) video.play?.().catch(() => {});
  });

  return button;
}

// Match an .mp4 URL anywhere in a string. The CMS sometimes rewrites the ".mp4"
// extension to a "-mp4" suffix in hrefs, so accept that form too.
const MP4_URL_RE = /https?:\/\/\S+?\.mp4(?:\?\S*)?/i;
const MP4_MANGLED_RE = /-mp4(\?|$)/i;

// Find an authored video source in the image cell. The author can supply either
// a link to an .mp4 OR a plain-text .mp4 URL. The real URL may live in the link
// text, the href, or a paragraph's text; a mangled "-mp4" href is repaired.
function findVideoSource(imageCell) {
  const links = [...imageCell.querySelectorAll('a[href]')];
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const textMatch = (link.textContent || '').match(MP4_URL_RE);
    if (textMatch) return { remove: link, src: textMatch[0] };
    const href = link.getAttribute('href') || '';
    if (/\.mp4(\?|$)/i.test(href)) return { remove: link, src: href };
    if (MP4_MANGLED_RE.test(href)) return { remove: link, src: href.replace(MP4_MANGLED_RE, '.mp4$1') };
  }

  // Plain-text URL (no anchor) — scan paragraphs that aren't the picture.
  const paragraphs = [...imageCell.querySelectorAll('p')].filter((p) => !p.querySelector('picture, img'));
  for (let i = 0; i < paragraphs.length; i += 1) {
    const match = (paragraphs[i].textContent || '').match(MP4_URL_RE);
    if (match) return { remove: paragraphs[i], src: match[0] };
  }
  return null;
}

function decorateBackgroundVideo(slide, imageCell) {
  // Author supplies an .mp4 (link or plain URL) alongside an optional <picture>
  // poster. The picture (if present) stays as a persistent fallback layer; the
  // video stacks on top and only plays when motion is allowed and autoplay works.
  const found = findVideoSource(imageCell);
  if (!found) return null;
  const { remove: videoLink, src: videoSrc } = found;

  slide.classList.add('hero-banner-slide-video-present');

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduceMotion) {
    // Keep the poster image as a static background; drop the video reference.
    videoLink.remove();
    return null;
  }

  const posterImg = imageCell.querySelector('picture img');
  const video = document.createElement('video');
  video.classList.add('hero-banner-slide-video');
  video.muted = true;
  video.loop = true;
  video.autoplay = true;
  video.playsInline = true;
  video.preload = 'auto';
  video.setAttribute('aria-hidden', 'true');
  video.setAttribute('tabindex', '-1');
  if (posterImg) video.poster = posterImg.currentSrc || posterImg.src;

  const source = document.createElement('source');
  source.src = videoSrc;
  source.type = 'video/mp4';
  video.append(source);

  videoLink.replaceWith(video);

  // Sound toggle sits on the slide (above the gradient/content layers).
  const toggle = createSoundToggle(video);
  slide.append(toggle);

  // Autoplay blocked (e.g. low-power mode) — remove the video and its toggle
  // so the poster picture remains the visible background.
  video.play?.().catch(() => {
    video.remove();
    toggle.remove();
  });

  return video;
}

// Opt-in adaptive height: the slide adopts the media's natural aspect ratio so
// the full image/video shows uncropped (no fixed height, object-fit: contain).
// Seeds from the image's intrinsic size to avoid layout shift, then refines
// from the video's real dimensions once metadata loads.
function applyAdaptiveHeight(slide, imageCell, video) {
  slide.classList.add('hero-banner-slide-adaptive');
  const setRatio = (w, h) => {
    if (w > 0 && h > 0) slide.style.aspectRatio = `${w} / ${h}`;
  };

  const img = imageCell.querySelector('picture img, img');
  if (img) {
    if (img.complete) setRatio(img.naturalWidth, img.naturalHeight);
    else img.addEventListener('load', () => setRatio(img.naturalWidth, img.naturalHeight), { once: true });
  }
  if (video) {
    video.addEventListener('loadedmetadata', () => setRatio(video.videoWidth, video.videoHeight), { once: true });
  }
}

function createSlide(row, slideIndex, bannerId, isCard, solidCta, adaptive) {
  const slide = document.createElement('li');
  slide.dataset.slideIndex = slideIndex;
  slide.setAttribute('id', `hero-banner-${bannerId}-slide-${slideIndex}`);
  slide.classList.add('hero-banner-slide');
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'Slide');

  const columns = [...row.querySelectorAll(':scope > div')];
  // Third cell (Terms) is persistent banner chrome — pulled out in decorate(),
  // so only image + content stay inside the slide.
  const classNames = ['hero-banner-slide-image', 'hero-banner-slide-content'];
  columns.slice(0, 2).forEach((column, colIdx) => {
    column.classList.add(classNames[colIdx]);
    slide.append(column);
  });

  const imageCell = slide.querySelector('.hero-banner-slide-image');
  let video = null;
  if (imageCell) video = decorateBackgroundVideo(slide, imageCell);
  if (adaptive && imageCell) applyAdaptiveHeight(slide, imageCell, video);

  const content = slide.querySelector('.hero-banner-slide-content');
  if (content) {
    buttonize(content, solidCta);
    if (isCard) {
      const box = document.createElement('div');
      box.classList.add('hero-banner-slide-box');
      box.append(...content.childNodes);
      content.append(box);
    }
  }

  const labeledBy = slide.querySelector('h1, h2, h3, h4, h5, h6');
  if (labeledBy) slide.setAttribute('aria-labelledby', labeledBy.getAttribute('id'));

  // Stash any authored Terms cell (3rd column) for persistent rendering.
  if (columns[2]) slide.dataset.hasTerms = '';
  const termsCell = columns[2] || null;

  return { slide, termsCell };
}

function updateSlide(block, slideIndex, instant = false) {
  const allSlides = [...block.querySelectorAll('.hero-banner-slide')];
  const realSlides = allSlides.filter((s) => !s.dataset.clone);
  const total = realSlides.length;
  const target = ((slideIndex % total) + total) % total;
  block.dataset.activeSlide = target;

  realSlides.forEach((slide, idx) => {
    const active = idx === target;
    slide.setAttribute('aria-hidden', !active);
    slide.querySelectorAll('a').forEach((link) => {
      if (!active) link.setAttribute('tabindex', '-1');
      else link.removeAttribute('tabindex');
    });
  });

  const indicators = block.querySelectorAll('.hero-banner-indicator');
  indicators.forEach((indicator, idx) => {
    indicator.setAttribute('aria-current', idx === target ? 'true' : 'false');
    // Graduated sizing: dots shrink with distance from the active one (Figma 2886:47420).
    indicator.dataset.distance = Math.min(Math.abs(idx - target), 3);
  });

  const slidesEl = block.querySelector('.hero-banner-slides');

  if (slideIndex >= total) {
    // Wrapping forward past last — smooth to clone-of-first, then snap to real first
    slidesEl.scrollTo({ top: 0, left: allSlides[allSlides.length - 1].offsetLeft, behavior: 'smooth' });
    slidesEl.addEventListener('scrollend', () => {
      slidesEl.scrollTo({ top: 0, left: realSlides[0].offsetLeft, behavior: 'instant' });
    }, { once: true });
  } else if (slideIndex < 0) {
    // Wrapping back past first — smooth to clone-of-last, then snap to real last
    slidesEl.scrollTo({ top: 0, left: allSlides[0].offsetLeft, behavior: 'smooth' });
    slidesEl.addEventListener('scrollend', () => {
      slidesEl.scrollTo({ top: 0, left: realSlides[total - 1].offsetLeft, behavior: 'instant' });
    }, { once: true });
  } else {
    slidesEl.scrollTo({ top: 0, left: realSlides[target].offsetLeft, behavior: instant ? 'instant' : 'smooth' });
  }
}

function createNavButton(label, ...classes) {
  const button = document.createElement('button');
  button.type = 'button';
  button.classList.add('hero-banner-nav', ...classes);
  button.setAttribute('aria-label', label);
  return button;
}

function buildControls(block, total, showDots) {
  const step = (delta) => updateSlide(block, parseInt(block.dataset.activeSlide || '0', 10) + delta);

  // Large circular arrows on the left/right edges (Figma Group 25233)
  const edgeNav = document.createElement('div');
  edgeNav.classList.add('hero-banner-edge-nav');
  const edgePrev = createNavButton('Previous slide', 'hero-banner-edge', 'hero-banner-prev');
  const edgeNext = createNavButton('Next slide', 'hero-banner-edge', 'hero-banner-next');
  edgeNav.append(edgePrev, edgeNext);
  block.append(edgeNav);

  edgePrev.addEventListener('click', () => step(-1));
  edgeNext.addEventListener('click', () => step(1));

  if (!showDots) return;

  // Bottom-center graduated dots (Figma node 2886:47420)
  const bar = document.createElement('div');
  bar.classList.add('hero-banner-controls');

  const indicators = document.createElement('div');
  indicators.classList.add('hero-banner-indicators');
  indicators.setAttribute('role', 'tablist');
  for (let i = 0; i < total; i += 1) {
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.classList.add('hero-banner-indicator');
    dot.dataset.targetSlide = i;
    dot.setAttribute('role', 'tab');
    dot.setAttribute('aria-label', `Show slide ${i + 1} of ${total}`);
    indicators.append(dot);
  }

  bar.append(indicators);
  block.append(bar);

  indicators.querySelectorAll('.hero-banner-indicator').forEach((dot) => {
    dot.addEventListener('click', () => {
      updateSlide(block, parseInt(dot.dataset.targetSlide, 10));
    });
  });
}

function startAutoplay(block, total, interval = 6000) {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (total < 2 || reduceMotion) return;

  let timer;
  const advance = () => updateSlide(block, parseInt(block.dataset.activeSlide || '0', 10) + 1);
  const play = () => {
    timer = window.setInterval(advance, interval);
  };
  const pause = () => {
    window.clearInterval(timer);
  };

  block.addEventListener('mouseenter', pause);
  block.addEventListener('mouseleave', play);
  block.addEventListener('focusin', pause);
  block.addEventListener('focusout', play);

  play();
}

let bannerId = 0;
export default async function decorate(block) {
  bannerId += 1;
  block.setAttribute('id', `hero-banner-${bannerId}`);
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'Carousel');

  const isCard = block.classList.contains('card');
  // Secondary variant uses the solid-white CTA treatment.
  const solidCta = block.classList.contains('secondary');
  // Opt-in: banner height follows the image/video natural aspect ratio.
  const adaptive = block.classList.contains('adaptive');
  const showDots = !block.classList.contains('no-dots');
  const autoplay = !block.classList.contains('no-autoplay');

  const rows = [...block.querySelectorAll(':scope > div')];
  const isSingleSlide = rows.length < 2;

  const slidesWrapper = document.createElement('ul');
  slidesWrapper.classList.add('hero-banner-slides');

  let termsCell = null;
  rows.forEach((row, idx) => {
    const { slide, termsCell: cell } = createSlide(
      row,
      idx,
      bannerId,
      isCard,
      solidCta,
      adaptive,
    );
    slidesWrapper.append(slide);
    if (cell && !termsCell) termsCell = cell;
    row.remove();
  });

  if (!isSingleSlide) {
    // Prepend clone of last + append clone of first for infinite loop
    const firstClone = slidesWrapper.firstElementChild.cloneNode(true);
    const lastClone = slidesWrapper.lastElementChild.cloneNode(true);
    [firstClone, lastClone].forEach((clone) => {
      clone.dataset.clone = 'true';
      clone.setAttribute('aria-hidden', 'true');
      clone.querySelectorAll('a').forEach((a) => a.setAttribute('tabindex', '-1'));
    });
    slidesWrapper.prepend(lastClone);
    slidesWrapper.append(firstClone);
  }

  block.prepend(slidesWrapper);

  if (!isSingleSlide) {
    buildControls(block, rows.length, showDots);
    if (autoplay) startAutoplay(block, rows.length);
  }

  // Persistent Terms tag — authored once, shown across all slides (Figma).
  if (termsCell) {
    const terms = document.createElement('div');
    terms.classList.add('hero-banner-slide-terms');
    terms.append(...termsCell.childNodes);
    block.append(terms);
  }

  updateSlide(block, 0, true);
}
