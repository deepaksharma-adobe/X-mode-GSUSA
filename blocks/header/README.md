# Header Block

## Overview

The Header block provides the main navigation and commerce functionality for the site. It includes responsive navigation with dropdown menus, authentication (sign in/sign out), wishlist access, mini cart with lazy loading, and product search with live results. The block handles both desktop and mobile layouts with hamburger menu support and manages various interactive panels.

## Integration

### Block Configuration

No block configuration is read via `readBlockConfig()`. The header uses metadata tags for fragment paths.

### URL Parameters

No URL parameters are directly read by the header block.

### Local Storage

No localStorage keys are used directly by this block. Authentication and cart state are managed through cookies and the event bus.

### Session Storage

| Key | Purpose |
|---|---|
| `gs-header-offer-dismissed` | When set to `true`, the offer/code bar is not rendered for the session |
| `storeConfig` | Cached store configuration for the seller assisted buying banner (`renderSellerAssistedBuyingBanner.js`) |

### Events

#### Event Listeners

- `events.on('cart/data', callback)` - Updates cart item counter and preloads mini cart fragment when cart data changes (eager loading enabled)
- `events.on('authenticated', callback)` - Handled in `renderAuthCombine.js` and `renderAuthDropdown.js` for authentication state changes

#### Event Emitters

No events are directly emitted by this block. However, it triggers events indirectly through imported modules:

- Mini cart triggers `publishShoppingCartViewEvent()` when opened
- Search triggers product discovery events through the search dropin

### Metadata

The block reads the following metadata tags:

- `nav` - Path to navigation fragment (default: `/nav`)
- `wishlist` - Path to wishlist page (default: `/wishlist`)
- `mini-cart` - Path to mini cart fragment (default: `/mini-cart`)

## Behavior Patterns

### Page Context Detection

- **Desktop Mode** (≥1100px): Horizontal nav strip, hover mega menu, hamburger hidden; nav wrapper is in document flow (not fixed overlay)
- **Mobile Mode** (<1100px): Hamburger menu with accordion navigation, “Choose your experience” audience strip, full-screen menu when open
- **Checkout Pages**: Mini cart button is hidden on `/checkout` path

### Navigation Structure

The header loads content from the nav fragment (`nav` metadata, default `/nav`).

**Supported fragment layouts:**

| Sections | Order | Detection |
|---|---|---|
| 3 | Offer bar → Brand → Main menu | Offer detected by **content heuristics** (prose + CTA links, not home logo or main nav) |
| 3 | Brand → Main menu → (optional tools) | Standard layout without promo bar |
| 4 | Offer → Brand → Main menu → Tools | **Positional** — first section is always the offer bar |

Section roles are assigned by content where possible:

- **Offer** — paragraphs plus one or more CTA links (not a lone home link)
- **Brand** — home link (`/`), logo image, or logo icon; no top-level nav `<ul>`
- **Menu** — top-level `<ul>` with main navigation items
- **Tools** — optional fragment section; if absent, an empty `.nav-tools` container is created in JS

Commerce tools (wishlist, mini cart, search, auth, and optionally company switcher) are always appended into `.nav-tools`. A **positional fallback** applies when heuristics do not match (legacy fragments).

### API-Driven Main Menu

When `nav-api-endpoint` is enabled in `config.json`, the header **replaces** the main menu links with the Catalog Service category tree. Offer bar, brand, tools, and any authored **Account** item in the nav fragment are preserved.

The nav tree is fetched by `fetchNav.js`, which runs a Catalog Service `categories` query (via the shared `CS_FETCH_GRAPHQL` instance) and transforms the flat category list into a nested `NavItem[]` tree (`{ label, href, children }`).

| Config key | Purpose |
|---|---|
| `nav-api-endpoint` | Feature flag. Any truthy value enables the API-driven menu; set to `false` to disable and use the fragment-only menu. |
| `commerce-root-category-id` | *(Optional)* Root category id whose children become the top-level nav. Defaults to `"2"`. |

**How it maps categories → nav:**

- The root category (`commerce-root-category-id`, default `"2"`) is the container — its children become the top-level items.
- Hierarchy is rebuilt from each category's `parentId`; siblings are ordered by the merchandising `position` (the API returns categories in id order, so `position` is what puts them in the intended menu order).
- `href` is `/{urlPath}` (the API returns the full path per category); links are localized via `rootLink`.
- Only categories with the `active` + `show_in_menu` roles are returned (enforced by the query).
- The query depth is 3, matching the mega-menu's supported nesting.

**DOM mapping:**

| API level | Mega menu output |
|---|---|
| Top-level item | `<li><p><a>label</a></p>` + optional submenu |
| Child with `children` | Column heading + nested links; splits to the next column after 6 links (Figma `2938:22045`) |
| Child without `children` | Single-link column (heading only, from API `label` / `href`) |
| Wrapped rows | Full-width horizontal rule between rows (Figma `2697:357110`) |
| Empty `children` | Top-level link only (no dropdown) |

Nav data is cached in `sessionStorage` (`gs-nav-data`, 2h TTL). If the category query fails, the header logs a console warning and leaves the authored fragment menu in place.

### Mega-Menu Promo Rail (authored)

The category **columns** come from the API; the **promo rail** on the right of a mega menu (Figma `8860:170399` — e.g. "New Arrivals" banners) is a **standalone DA fragment per menu**, mapped in a placeholder sheet. `fetchNavPromos.js` (`getNavPromo`) reads the sheet and, on first hover/focus of a menu, lazy-loads that menu's fragment and injects it into the panel.

**1. Map menus → fragments** in the `placeholders/nav.json` sheet (tab named `data`, columns `Key`/`Value`):

| Key | Value |
|---|---|
| `/new` | `fragments/promo-card` |
| `/uniforms` | `fragments/uniforms-promo` |

- **`Key`** = the top-level menu **path** — the category `urlPath` with a leading slash (e.g. `New` → `/new`, `New & Featured` → `/new-and-featured`). It must match the menu's link path exactly.
- **`Value`** = the fragment path (leading slash optional; the locale root is added automatically).

**2. Author each fragment** as a normal DA document (e.g. `/fragments/promo-card`) — image + heading + link, offer cards, whatever. The fragment styles its own content; the rail just sizes/places it (~324px, right side, desktop only).

- Menus with **no row** in the sheet render **columns only** (no error). A missing sheet or fragment is non-fatal.
- Loads **lazily per menu** on first hover/focus, and each fragment is fetched at most once — nothing is on the initial header path.
- The rail shows on desktop mega menus (≥1100px) only; the mobile accordion hides it.

### Offer / Code Bar

A dismissible lime promotional bar rendered **above** the nav bar (Figma `Offer-Code` 2697:346344). Authored as a nav fragment section with this content (in order):

```
Free Gift with purchase of a Uniform – Use Code: FREEPURPLEBAG   ← message paragraph
[Redeem Now](/sale)                                              ← redeem link (first link)
[Terms & Conditions](/terms)                                     ← terms link (second link)
```

The message must include ` – Use Code:` so JS can split the copy for the mobile stacked layout.

**Responsive layout (matches Figma):**

| Breakpoint | Layout |
|---|---|
| Mobile (<768px) | Row 1: sparkle + lead line + close; Row 2: code + Redeem (underlined); Row 3: Terms (underlined) |
| Tablet (768px+) | Single row: sparkle + full message + Redeem (underlined) + Terms (underlined) + close |
| Desktop (1280px+) | Single row with 56px margins, 40px gap; message medium weight; Redeem/Terms forest green, no underline |

- Sparkle icon (`icons/sparkle.svg`, 18px) and close (24px) are injected by JS
- Dismissal: `sessionStorage` key `gs-header-offer-dismissed`
- Colors: `--color-gs-star` background; `--color-gs-dark-green` underlined CTAs (mobile/tablet); `--color-gs-forest` plain CTAs (desktop)

### Brand Section

Authors provide a home link (and optionally a CMS logo image) in the brand section of the nav fragment. During decoration, JS **replaces or injects** the site logo:

- Source: `/icons/gs-logo.svg`
- Dimensions: 145×48
- Alt text: `Girl Scouts`

### For Everyone / For Leaders Toggle

A JS-built audience toggle prepended to the nav bar. Not authored — it is a fixed UI control.

- **For Everyone** — active tab, links to `/`
- **For Leaders** — links to `/leaders`
- Visible on mobile/tablet inside `.nav-mobile-experience` (<1100px)
- Visible in `.nav-top-leading` on desktop (≥1100px)
- Uses `role="tablist"` / `role="tab"` for accessibility

### Overlay

A `.overlay` element is injected into `<header>` at module load. It receives class `show` when:

- Desktop: a nav dropdown is hovered open
- Mobile: the hamburger menu is open

### Mobile Submenus

On mobile/tablet (<1100px), nested nav items with child lists receive a `.submenu-wrapper` containing:

- A **“All Categories”** back link (injected header)
- The submenu title (from the parent item label)
- Cloned submenu links

The top bar (logo, hamburger, tools) and “Choose your experience” strip remain visible when the menu is open.

On desktop (≥1100px), mega menu panels open on hover with a full-bleed dropdown layout (Figma `2697:357110`). Open/close uses `--nav-mega-menu-transition`; the dimmed backdrop uses `--nav-overlay-transition`. On mobile, accordion sections animate with `--nav-accordion-transition` (chevron rotation + panel expand).

### User Interaction Flows

#### Navigation

1. **Desktop**: Users hover over navigation items to reveal dropdowns with overlay background
2. **Mobile**: Users tap hamburger menu to open full navigation, tap categories to reveal submenus
3. **Keyboard Navigation**: Full keyboard support with Tab, Enter, Space, and Escape keys
4. **Focus Management**: Automatic focus handling when dropdowns are open

#### Wishlist

1. Users click wishlist button to navigate to wishlist page
2. Button is always visible in the tools section

#### Mini Cart

1. **Lazy Loading**: Mini cart fragment loads on first interaction or when cart contains items
2. **Cart Counter**: Displays total quantity badge when items are in cart
3. **Panel Toggle**: Click cart button to open/close mini cart panel
4. **Auto-preload**: If cart data exists, mini cart fragment preloads automatically
5. **Analytics**: Publishes shopping cart view event when opened
6. **Undo mode**: If the mini-cart fragment includes `undo-remove-item`, click-outside to close is stricter (clicks inside `header` do not close the panel)

#### Search

1. **Lazy Loading**: Search functionality loads on first click
2. **Live Search**: Shows results after typing 3 characters with 4 results displayed
3. **Product Links**: Each result links to product detail page via `getProductLink()`
4. **View All**: Footer button links to full search results page (label from placeholders: `Global.SearchViewAll`)
5. **Form Submit**: Enter key navigates to search results page
6. **Panel Close**: Click outside or Escape key closes search panel
7. **Placeholders**: Search input placeholder from `Global.Search` via `fetchPlaceholders()`

#### Authentication

1. **Sign In Flow**:
   - Unauthenticated users see sign-in form in the tools dropdown (`renderAuthDropdown.js`)
   - **Auth Combine** modal (`renderAuthCombine.js`) opens from the last submenu item under the **Account** nav column (e.g. authored text “Combined Auth”)
   - On successful login, page automatically reloads to ensure all components reflect the authenticated state
2. **Sign Out Flow**:
   - Authenticated users see account menu with logout button
   - Logout revokes token asynchronously, then either redirects to a specific page or reloads the current page
   - Special redirects on logout: checkout → cart, customer pages → login, order details → home
   - All other pages simply reload to reflect the logged-out state
3. **User Display**: Dropdown shows authenticated user state via auth dropins

#### Auth Combine — Nav Authoring

For the combined sign-in/sign-up modal to wire up, the nav fragment must include:

1. A top-level nav item whose label contains **Account**
2. A submenu under Account whose **last `<li>`** is the trigger row (e.g. `Combined Auth`)

If the nav menu `<ul>` is missing or mis-structured, `renderAuthCombine` exits safely without throwing.

#### Company Switcher (B2B)

When the user is authenticated **and** `commerce-companies-enabled` is true in AEM config:

- `renderCompanySwitcher.js` loads the Company Switcher dropin into `.nav-tools`
- Company change may redirect away from detail pages (orders, POs, quotes) per configured redirection rules

#### Seller Assisted Buying Banner

1. **Display Conditions**: Banner appears when user is authenticated and `auth_dropin_admin_session` cookie is present
2. **Session Information**: Displays customer name (bold) and website name from store config
3. **Store Config Caching**: Fetches store config from sessionStorage if available, otherwise calls API and caches result
4. **Close Session**: Button revokes customer token and redirects to home page
5. **Event Handling**: Automatically removes banner when authentication state changes or admin session cookie is cleared
6. **Error Handling**: Gracefully handles JSON parse errors and API failures with console warnings

### State Management

#### Panel Loading States

- Panels use `data-loaded`, `data-loading`, and `data-pending-toggle` attributes
- Loading indicator shows via `aria-busy` attribute on buttons
- Pending toggles queue up during loading and execute after completion

#### Responsive Behavior

- Media query breakpoint at **1100px** switches between desktop and mobile nav (JS `isDesktop` and CSS)
- **1100–1279px (narrow desktop)**: first-level nav left-aligned; `--grid-2-margins` on nav strip and mega menu
- **1280px+**: full desktop spacing (`--grid-3-margins`, 32px nav gaps)
- Offer bar desktop styling remains at **1280px+** (unchanged)
- Window resize resets navigation state and removes active classes
- Overlay visibility managed based on navigation state and viewport size

### Error Handling

- **Fragment Loading**: If nav fragment fails to load, block handles gracefully
- **Metadata Fallbacks**: Uses default paths when metadata is not specified
- **Nav classification**: Warns in console if no brand section is found; falls back to positional mapping
- **Auth Combine**: Returns early if nav sections or menu `<ul>` is absent
- **Panel Loading Errors**: Caught in `withLoadingState` wrapper, sets loading state to false
- **Image Rendering**: Delegates to AEM Assets image rendering with fallback support; brand logo uses fixed GS asset path
- **Search Errors**: Handled by product discovery dropin container
- **Network Failures**: Authentication and cart operations handle network errors through dropins

## Files

- `header.js` - Main block logic, nav classification, offer bar, audience toggle, and tool integrations
- `fetchNav.js` - Runs the Catalog Service category query and transforms it into the nav tree (session cached)
- `fetchNavPromos.js` - Maps a menu path → promo fragment via `placeholders/nav.json` and lazy-loads that fragment on hover (`getNavPromo`)
- `buildNavMenu.js` - Converts the nav tree into mega-menu DOM
- `header.css` - Styles for navigation, offer bar, panels, and responsive layouts
- `renderAuthCombine.js` - Authentication modal triggered from Account nav submenu
- `renderAuthDropdown.js` - Authentication dropdown for desktop with sign in form and user menu
- `renderCompanySwitcher.js` - B2B company switcher dropin in nav tools (when enabled)
- `renderSellerAssistedBuyingBanner.js` - Banner component for seller assisted buying sessions with session management
