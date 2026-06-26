# Fragment Block

## Overview

Includes content from another page as a reusable fragment. Used to share content (nav, footer, promos) across multiple pages without duplicating authoring.

## Authored Structure

| Fragment path or link |
|---|
| `/fragments/my-fragment` or a hyperlink to the fragment page |

## Behaviour

- Fetches the fragment page via `.plain.html` endpoint
- Decorates and loads all sections from the fragment inline
- Resolves relative media paths (`./media_*`) relative to the fragment's base path
- Replaces the block entirely with the fragment content

## Export

Also exports `loadFragment(path)` used by other blocks (footer, enrichment, targeted-block).

## Error Handling

- Returns `null` silently if the path is invalid or the fetch fails
