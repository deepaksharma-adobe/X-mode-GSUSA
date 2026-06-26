# GS Ecom Shop — Agent Context

Quick-read primer for `aemcoder.adobe.io` sessions.
Read this first, then read `AGENTS.md` for the full coding rules.

---

## Project

- **Stack**: AEM Edge Delivery Services + AEM Boilerplate Commerce
- **Repo**: `gs-ecom-shop-eds` on GitHub
- **Content backend**: Document Authoring (`*.aem.live`)

## Development Workflow

Each block is built from a Figma design provided per task.

1. User provides a Figma node URL for the block to implement
2. Agent reads `CONTEXT.md` + `AGENTS.md` to load GS rules
3. Agent fetches the Figma node to extract layout, tokens, and assets
4. Agent proposes a content model (authored HTML structure) — **wait for approval**
5. Agent implements block JS + CSS section by section — **show diff after each section**
6. Agent updates `blocks/{blockname}/README.md` — new blocks require it, modified blocks must reflect changes
7. Test locally at `http://localhost:3000` before opening a PR

> Always extract design values as CSS token names (`var(--color-gs-green)`), not raw hex.
> Use `drafts/foundation.html` to verify any token or component already exists before creating new ones.

---

## Key Files

| File | What it contains |
|---|---|
| `AGENTS.md` | Full coding rules — always read before writing code |
| `styles/styles.css` | Single source of truth for all design tokens |
| `drafts/foundation.html` | Live design system reference (tokens, grid, buttons, icons, SVG techniques) |

---

## Brand Assets

| Asset | Path | Use when |
|---|---|---|
| Standard logo | `/icons/gs-logo.svg` | Light backgrounds — header |
| White logo | `/icons/gs-logo-white.svg` | Dark backgrounds — footer, forest-green sections |

---

## Primary Brand Colours

> In CSS always use `var(--token-name)` — never hardcode hex.
> Use hex only in third-party widget `init()` calls (they cannot read CSS vars).

| Token | Hex | Name |
|---|---|---|
| `--color-gs-green` | `#00b451` | Girl Scouts Green — primary |
| `--color-gs-forest` | `#005640` | Forest Green — footer bg, CTA hover |
| `--color-gs-poppy` | `#ee3124` | Poppy — alerts, errors |
| `--color-gs-star` | `#d5f267` | Star Green — accent |
| `--color-gs-violet` | `#9e5fd6` | Violet — secondary accent |

---

## Breakpoints

| Tier | Media query | Grid |
|---|---|---|
| Mobile | default — no query | 4 col / 20px margin / 16px gutter |
| Tablet | `@media (min-width: 768px)` | 12 col / 20px margin / 16px gutter |
| Desktop | `@media (min-width: 1280px)` | 12 col / 56px margin / 24px gutter |

For tablet-only styles use range syntax: `@media (768px <= width < 1280px)`

## Page Layout

Every page is: `<header>` + `<main>` + `<footer>` (full-bleed shell).

Inside `<main>`, EDS generates `.section > div` for each authored section. `styles.css` already applies containment to every inner `div`:

```css
main > .section > div {
  max-width: var(--grid-max-width); /* 1280px */
  margin: auto;
  padding: 0 var(--grid-margin);   /* 20px mobile → 56px desktop */
}
```

- **Contained block** — do nothing; the wrapper handles it automatically.
- **Full-bleed block** — set `padding: 0` on the block, then wrap content in an inner div with `max-width: var(--grid-max-width)` + `padding: var(--spacing-*) var(--grid-*-margins)`.
- **Content width at desktop** — 1168px (1280px frame − 56px × 2 margins).
- **Section gaps** — 48px mobile · 64px tablet · 96px desktop (auto via `styles.css`; don't set on blocks).

---

## Hard Rules (summary — full rules in AGENTS.md)

- **Never modify** `scripts/aem.js` or anything inside `scripts/__dropins__/`
- **Never hardcode hex** in CSS — always `var(--token-name)`
- **Never use `!important`** — except `main[hidden]` reset in `styles.css`
- **Never use `max-width`** media queries — mobile-first `min-width` only
- **No `innerHTML`** — always use DOM API (`createElement`, `textContent`, `append`)
- All block CSS selectors must be scoped to `.{blockname}`
- Third-party scripts belong in `scripts/delayed.js` only — never `head.html` or block JS

---

## Z-Index Scale

| Token | Value | Use |
|---|---|---|
| `--z-raised` | 10 | Cards on hover |
| `--z-dropdown` | 100 | Dropdowns |
| `--z-sticky` | 200 | Sticky nav |
| `--z-modal` | 300 | Modals |
| `--z-overlay` | 400 | Overlays |
| `--z-toast` | 500 | Toasts — our maximum |
| 501–9,999,998 | — | Reserved for third-party widgets |
| 9,999,999 | — | AccessiBe (by design) |

---

## Session Start Prompt

```
Read AGENTS.md before starting.
Show plan first, wait for approval, then implement section by section.
```
