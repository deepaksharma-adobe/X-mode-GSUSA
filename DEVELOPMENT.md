# Development Guide

## Branching Strategy

### Branch Types

| Branch | Created from | Merges into | Lifetime |
|---|---|---|---|
| `main` | — | — | Permanent |
| `develop` | `main` | — | Permanent |
| `feature/*` | `develop` | `develop` | Delete after merge |
| `release/*` | `develop` | `main` | Delete after merge |
| `hotfix/*` | `main` | `main` + `develop` | Delete after merge |

### Branch Naming

```
feature/TICKET-123-short-description
fix/TICKET-124-short-description
hotfix/TICKET-125-short-description
release/v1.0.0
chore/update-dependencies
docs/update-readme
refactor/cart-block-cleanup
```

Rules:
- Lowercase, hyphens only — no spaces
- Ticket IDs may be uppercase (e.g. `JIRA-123`)
- **Max 38 characters** after the `/` — EDS preview URL DNS limit
- Validated by husky `pre-push` hook and CI on every push

### EDS Branch & Production Rules

> **Only `main` is production.** All other branches (`release/*`, `develop`, `feature/*`) receive staging cache headers and do not trigger push invalidation on the CDN. Never use a non-main branch as a live production URL.

### EDS Preview URL Constraints

EDS constructs preview URLs as `https://{branch}--{repo}--{owner}.aem.page`. Slashes in branch names become `--` and the whole subdomain must be ≤ 63 characters.

```
feature/my-cart  →  feature--my-cart--gs-ecom-shop-eds--gsusa.aem.page
                    ← 25 chars reserved for repo+owner →
                    ← max 38 chars for your branch description →
```

- Uppercase letters are lowercased by EDS (`JIRA-123` → `jira-123` in URL)
- The husky `pre-push` hook blocks branches that exceed 38 characters

---

## Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(optional-scope): <description>
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `chore` | Maintenance, dependency bumps |
| `docs` | Documentation only |
| `style` | CSS/formatting, no logic change |
| `refactor` | Code restructure, no behaviour change |
| `test` | Adding or updating tests |
| `perf` | Performance improvement |
| `ci` | CI/CD changes |
| `build` | Build system changes |
| `revert` | Reverting a previous commit |

### Rules

- Max 72 characters
- Lowercase first letter after colon
- No trailing period
- Merge commits are exempt

### Examples

```
feat(cart): add gift wrapping option
fix(header): resolve auth dropdown z-index
fix(lib): correct utility function return value
chore: bump drop-in packages to stable
refactor(pdp): simplify image gallery logic
ci: add branch name validation workflow
```

### Scope

Scope is optional but recommended. Use the block name, script name, or area affected:

```
feat(cart): ...         ← block name
fix(lib): ...           ← scripts/lib utility
chore(deps): ...        ← dependencies
ci(workflows): ...      ← CI/CD
style(hero): ...        ← specific block styles
```

Validated by husky `commit-msg` hook locally and CI on every push.

---

## Pull Request Flow

### Feature development

```
git checkout develop
git pull origin develop
git checkout -b feature/TICKET-123-your-feature

# do your work
git commit -m "feat(scope): your change"
git push origin feature/TICKET-123-your-feature

# open PR → develop
```

### Release

```
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0
git push origin release/v1.0.0

# open PR → main
# after merge, sync main back into develop via GitHub "Update branch" button
```

### Hotfix

```
git checkout main
git pull origin main
git checkout -b hotfix/TICKET-999-critical-fix

# fix the issue
git commit -m "fix(scope): critical fix description"
git push origin hotfix/TICKET-999-critical-fix

# open PR → main
# after merge, sync main back into develop via GitHub "Update branch" button
```

---

## PR Requirements

### All PRs
- PR title must follow Conventional Commits format
- Branch name must match allowed pattern
- All commit messages must follow Conventional Commits
- At least 1 approval from `@gsusa/Ecom-Shop-RW`

### PRs targeting `main`
- 2 approvals required
- `aem-psi-check` (PageSpeed 100) must pass
- CODEOWNERS approval required — changed files determine who must approve

---

## Code Ownership

### Requires `@deepaksharma-adobe` OR `@a-tushargupta` OR `@anprasad-adobe`

- `.github/` — CI/CD workflows and CODEOWNERS
- `.husky/` — git hooks
- `.eslintrc.js` — JS lint rules
- `.stylelintrc.json` — CSS lint rules
- `.editorconfig` — editor standards
- `config.json`, `head.html` — store configuration
- `scripts/aem.js` — AEM core library (never modify)
- `scripts/scripts.js` — main entry point
- `scripts/commerce.js`, `scripts/initializers/` — commerce config
- `scripts/__dropins__/` — drop-in packages (no manual changes)
- `styles/styles.css` — global styles
- `models/`, `component-*.json` — component schemas
- Critical commerce blocks: `commerce-cart`, `commerce-checkout`, `commerce-login`, `commerce-account-*`, `product-details`, `product-list-page`

### Requires `@gsusa/Ecom-Shop-RW` approval

- All other files (`blocks/`, `styles/`, `scripts/components/`)

---

## Protected Branches

| Branch | Direct push | Min approvals | Status checks |
|---|---|---|---|
| `main` | ❌ | 2 | `Branch Name`, `Commit Messages`, `aem-psi-check` |
| `develop` | ❌ | 1 | `Branch Name`, `Commit Messages` |

All other branches are auto-deleted after merge.

---

## Block README Requirement

Every block **must** have a `README.md` — commits are blocked by a husky hook if a modified block is missing one.

### Required sections

| Section | What to include |
|---|---|
| **Overview** | What the block does and when to use it |
| **Authored Structure** | Table showing the expected CMS authoring structure |
| **Configuration** | All config options, their values and effect |
| **Behaviour** | How the block works, user interactions, edge cases |
| **Dependencies** | Other blocks or scripts it relies on |
| **Error Handling** | How failures are handled |

### Template

```markdown
# Block Name

## Overview
## Authored Structure
## Configuration
## Behaviour
## Dependencies
## Error Handling
```

Use `block-readme-template.md` at the project root as a reference.

---

## Lint Rules

### JavaScript (`.eslintrc.js`)
- Airbnb base rules
- `.js` extension required on all imports
- `innerHTML` / `outerHTML` — **warning** (XSS risk, use DOM APIs)
- `console.log` blocked — use `console.warn/error/info/debug`

### CSS (`.stylelintrc.json`)
- Standard config + GS-specific rules
- `px` for `font-size`, `margin`, `padding` — **warning** (use `rem`)
- Modern color function notation enforced (`rgb(0 0 0 / 0.5)`)
- All selectors must be scoped to block name
- `scripts/__dropins__/**/*.css` excluded from linting

---

## Local Setup

```bash
npm install            # install dependencies + deploy drop-ins
npm run lint           # run before committing
npm run lint:fix       # auto-fix lint issues
npx @adobe/aem-cli up  # start dev server at localhost:3000
```

Husky hooks are installed automatically on `npm install`:
- `commit-msg` — validates commit message format
- `pre-push` — validates branch name before push

---

## EDS Preview URLs

| Branch | Preview URL |
|---|---|
| `feature/my-feature` | `https://feature--my-feature--gs-ecom-shop-eds--gsusa.aem.page` |
| `release/v1.0.0` | `https://release--v1.0.0--gs-ecom-shop-eds--gsusa.aem.page` |
| `develop` | `https://develop--gs-ecom-shop-eds--gsusa.aem.page` |
| `main` | `https://main--gs-ecom-shop-eds--gsusa.aem.live` |

> Note: `/` in branch names becomes `--` in the preview URL.
