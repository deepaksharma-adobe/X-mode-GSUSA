/**
 * Stories & Testimonials (Figma 2751:46705 — "Customer Stories")
 *
 * A coverflow image carousel: the active image is centred and large; the
 * previous/next images peek on the sides, dimmed. Below sits the active
 * slide's two-line quote and a "KNOW MORE" CTA. Prev/next arrows (desktop)
 * and a dynamic dot pager (tablet/mobile) drive navigation. No autoplay.
 *
 * Authoring: row 1 (single cell, no image) = the section heading. Each
 * subsequent row is one slide: cell 1 = image (+ optional .mp4 link/URL for a
 * click-to-play video), cell 2 = quote richtext (two paragraphs) including a
 * "KNOW MORE" link.
 *
 * The blue section backdrop is applied at the section level via the
 * "Stories Blue" Style option — not in this block. Navigation is the dot pager
 * (from the shared carousel-controls util); this block owns the
 * coverflow/crossfade engine. Prev/next arrows are intentionally hidden.
 */
import createCarouselControls from '../../scripts/carousel-controls.js';

let carouselId = 0;

// Supported video extensions and their MIME types.
// To add a format: add the extension to VIDEO_EXTS and its MIME type below.
const VIDEO_EXTS = 'mp4';
const VIDEO_MIME = {
  mp4: 'video/mp4',
};
// Match a video URL anywhere in a string. The CMS sometimes rewrites the
// extension to a dash-suffix (e.g. "-mp4"), so accept that mangled form too.
const VIDEO_URL_RE = new RegExp(`https?://\\S+?\\.(${VIDEO_EXTS})(?:\\?\\S*)?`, 'i');
const VIDEO_MANGLED_RE = new RegExp(`-(${VIDEO_EXTS})(\\?|$)`, 'i');
const VIDEO_EXT_RE = new RegExp(`\\.(${VIDEO_EXTS})`, 'i');

// Resolve a DA media viewer URL (da.live/media#/org/repo/path.mp4) to the
// actual streamable source served by the DA admin API.
function resolveDaMediaUrl(href) {
  try {
    const url = new URL(href);
    if (url.hostname === 'da.live' && url.pathname === '/media' && url.hash) {
      // hash = "#/org/repo/path/to/file.mp4" — strip the leading "#/"
      const sourcePath = url.hash.replace(/^#\/?/, '');
      return `https://admin.da.live/source/${sourcePath}`;
    }
  } catch (e) { /* not a valid URL — fall through */ }
  return href;
}

// Find an authored video source in the image cell. Returns the node to remove
// and the resolved src, or null.
function findVideoSource(imageCell) {
  const links = [...imageCell.querySelectorAll('a[href]')];
  for (let i = 0; i < links.length; i += 1) {
    const link = links[i];
    const textMatch = (link.textContent || '').match(VIDEO_URL_RE);
    if (textMatch) return { remove: link, src: resolveDaMediaUrl(textMatch[0]) };
    const href = link.getAttribute('href') || '';
    // Match any video extension anywhere in href — DA media URLs carry it in the hash fragment
    if (VIDEO_EXT_RE.test(href)) return { remove: link, src: resolveDaMediaUrl(href) };
    if (VIDEO_MANGLED_RE.test(href)) return { remove: link, src: resolveDaMediaUrl(href.replace(VIDEO_MANGLED_RE, '.$1$2')) };
  }
  const paragraphs = [...imageCell.querySelectorAll('p')].filter((p) => !p.querySelector('picture, img'));
  for (let i = 0; i < paragraphs.length; i += 1) {
    const match = (paragraphs[i].textContent || '').match(VIDEO_URL_RE);
    if (match) return { remove: paragraphs[i], src: match[0] };
  }
  return null;
}

// Click-to-play: swap the poster for an inline <video> and start playback.
// Stops propagation so it doesn't trigger the slide-advance click handler.
function playVideo(media, videoSrc, posterImg) {
  const video = document.createElement('video');
  video.className = 'stories-testimonials-video';
  video.controls = true;
  video.playsInline = true;
  video.preload = 'metadata';
  if (posterImg) video.poster = posterImg.currentSrc || posterImg.src;
  const source = document.createElement('source');
  source.src = videoSrc;
  const ext = (videoSrc.match(VIDEO_EXT_RE) || [])[1]?.toLowerCase() || 'mp4';
  source.type = VIDEO_MIME[ext] || 'video/mp4';
  video.append(source);
  media.replaceChildren(video);
  video.play?.().catch(() => {});
}

function buildSlide(row, uid, i) {
  const cells = [...row.children];
  const imageCell = cells[0];
  const contentCell = cells[1];

  const slide = document.createElement('li');
  slide.className = 'stories-testimonials-slide';
  slide.id = `${uid}-slide-${i}`;
  slide.setAttribute('role', 'group');
  slide.setAttribute('aria-roledescription', 'slide');

  const media = document.createElement('div');
  media.className = 'stories-testimonials-media';
  const pic = imageCell?.querySelector('picture');
  if (pic) media.append(pic);

  // Optional video: keep the picture as poster, add a click-to-play button.
  const video = imageCell ? findVideoSource(imageCell) : null;
  if (video) {
    video.remove.remove();
    slide.classList.add('stories-testimonials-slide-video');
    const posterImg = media.querySelector('picture img');

    if (!posterImg) {
      // No authored poster — render a muted video with preload="metadata" so the
      // browser decodes and paints the first frame as the visual placeholder.
      const previewVid = document.createElement('video');
      previewVid.className = 'stories-testimonials-video';
      previewVid.src = video.src;
      previewVid.preload = 'metadata';
      previewVid.muted = true;
      previewVid.playsInline = true;
      previewVid.addEventListener('loadedmetadata', () => {
        previewVid.currentTime = 0.1;
      }, { once: true });
      media.append(previewVid);
    }

    const play = document.createElement('button');
    play.type = 'button';
    play.className = 'stories-testimonials-play';
    play.setAttribute('aria-label', 'Play video');
    play.addEventListener('click', (e) => {
      e.stopPropagation();
      playVideo(media, video.src, posterImg);
    });
    media.append(play);
  }

  slide.append(media);

  // Quote + CTA travel with the slide but render in the shared content area.
  const content = document.createElement('div');
  content.className = 'stories-testimonials-content';
  if (contentCell) content.append(...contentCell.childNodes);

  const link = content.querySelector('a[href]');
  if (link) {
    const wrapper = link.closest('p') || link.parentElement;
    if (wrapper && wrapper !== content) wrapper.classList.add('stories-testimonials-cta-wrapper');
    link.classList.add('button', 'secondary', 'stories-testimonials-cta');
    const labelText = (link.textContent || '').trim();
    const labelSpan = document.createElement('span');
    labelSpan.className = 'stories-testimonials-cta-text';
    labelSpan.textContent = labelText;
    link.textContent = '';
    link.append(labelSpan);
    slide.setAttribute('aria-label', labelText);
  }

  return { slide, content };
}

export default function decorate(block) {
  carouselId += 1;
  const uid = `stories-testimonials-${carouselId}`;
  const rows = [...block.children];

  // First row with no image/video is the heading.
  // A row is a slide if it has a <picture> OR if its first cell has a video link
  // (video-only slide — no poster image authored).
  const isSlideRow = (row) => {
    if (row.querySelector('picture')) return true;
    const firstCell = row.children[0];
    return firstCell ? [...firstCell.querySelectorAll('a[href]')].some((a) => VIDEO_EXT_RE.test(a.getAttribute('href') || '')) : false;
  };

  let heading = null;
  const slideRows = [];
  rows.forEach((row) => {
    if (isSlideRow(row)) slideRows.push(row);
    else if (!heading) heading = row;
  });

  const built = slideRows.map((row, i) => buildSlide(row, uid, i));
  const slides = built.map((b) => b.slide);
  const contents = built.map((b) => b.content);
  const count = slides.length;

  block.textContent = '';
  block.setAttribute('role', 'region');
  block.setAttribute('aria-roledescription', 'carousel');

  // ----- Decorative curve header (Figma 5168:208537) -----
  // Full-bleed white band; wave shape via CSS mask on ::after; tree on right.
  const header = document.createElement('div');
  header.className = 'stories-testimonials-header';
  header.setAttribute('aria-hidden', 'true');
  const headerInner = document.createElement('div');
  headerInner.className = 'stories-testimonials-header-inner';
  const graphic = document.createElement('span');
  graphic.className = 'stories-testimonials-header-graphic';
  headerInner.append(graphic);
  header.append(headerInner);
  block.append(header);

  // ----- Coverflow viewport -----
  const viewport = document.createElement('div');
  viewport.className = 'stories-testimonials-viewport';
  const track = document.createElement('ul');
  track.className = 'stories-testimonials-track';
  track.id = `${uid}-track`;
  slides.forEach((s) => track.append(s));
  viewport.append(track);

  // ----- Shared content area (active slide's quote + CTA) -----
  const contentArea = document.createElement('div');
  contentArea.className = 'stories-testimonials-content-area';

  // ----- State -----
  let active = 0;

  // Infinite loop is opt-in via the "infinite-loop" block variant (class).
  // Default: a finite coverflow with arrows disabling at the first/last slide.
  const loop = count > 1 && block.classList.contains('infinite-loop');

  // Shared dot pager + prev/next arrows. loop makes the dot taper ring-aware to
  // match the infinite coverflow.
  const controls = createCarouselControls({
    prefix: 'stories-testimonials',
    count,
    controls: track.id,
    label: 'Story slide controls',
    itemNoun: 'story',
    prevLabel: 'Previous story',
    nextLabel: 'Next story',
    loop,
    onSelect: (i) => goTo(i),
    onPrev: () => goTo(active - 1),
    onNext: () => goTo(active + 1),
  });
  viewport.append(controls.prev, controls.next);

  // Body — constrained to the centered grid frame (header is full-bleed above)
  const body = document.createElement('div');
  body.className = 'stories-testimonials-body';
  block.append(body);

  if (heading) {
    const h = document.createElement('h2');
    h.className = 'stories-testimonials-heading';
    h.textContent = (heading.textContent || '').trim();
    body.append(h);
  }
  body.append(viewport, contentArea, controls.dotsNav);

  // Offset from the active slide. When looping, it's the shortest signed offset
  // on a ring of `count` slides (last slide's "next" peek is slide 0); when
  // finite, it's the plain linear offset so the ends don't peek-wrap.
  const relativeTo = (i) => {
    let rel = i - active;
    if (loop) {
      if (rel > count / 2) rel -= count;
      if (rel < -count / 2) rel += count;
    }
    return rel;
  };

  const render = () => {
    slides.forEach((s, i) => {
      const rel = relativeTo(i);
      s.classList.toggle('is-active', rel === 0);
      s.classList.toggle('is-prev', rel === -1);
      s.classList.toggle('is-next', rel === 1);
      // Far slides are parked off the sides (not centred) so they slide in/out
      // from the edges — never a ghost fade behind the active image.
      s.classList.toggle('is-far-prev', rel < -1);
      s.classList.toggle('is-far-next', rel > 1);
      s.setAttribute('aria-hidden', String(rel !== 0));
    });
    controls.setActive(active);
    // Disable arrows at the ends when finite (looping never disables).
    if (!loop) controls.setArrowsDisabled(active <= 0, active >= count - 1);
    // Swap the shared quote/CTA to the active slide's content.
    contentArea.replaceChildren(contents[active]);
  };

  // Looping wraps around (never disabled); finite clamps to [0, count-1].
  function goTo(i) {
    active = loop ? ((i % count) + count) % count : Math.min(Math.max(i, 0), count - 1);
    render();
    // Scroll to active slide on mobile/tablet (scroll-snap track).
    // On desktop the track has overflow: visible so this is a no-op.
    track.scrollTo({ left: slides[active].offsetLeft, behavior: 'smooth' });
  }

  // Clicking a peeking side image advances to it.
  slides.forEach((s, i) => {
    s.addEventListener('click', () => {
      if (i !== active) goTo(i);
    });
  });

  // Sync dot pager when user swipes on mobile/tablet (CSS scroll snap drives position).
  // On desktop the track has overflow: visible so scrollLeft never changes — harmless.
  track.addEventListener('scroll', () => {
    const i = Math.round(track.scrollLeft / track.clientWidth);
    if (i >= 0 && i < count && i !== active) {
      active = i;
      render();
    }
  }, { passive: true });

  render();
}
