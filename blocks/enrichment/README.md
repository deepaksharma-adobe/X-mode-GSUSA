# Enrichment Block

## Overview

Dynamically injects contextual content fragments into a page based on the current product SKU or category. Used to display targeted promotions, banners, or editorial content alongside product/category pages.

## Authored Structure

| Key | Value |
|---|---|
| `type` | `product` or `category` |
| `position` | (optional) position identifier for filtering |

## Configuration

| Option | Values | Description |
|---|---|---|
| `type` | `product`, `category` | Determines the context used to match fragments |
| `position` | any string | Optional filter to match fragments by position slot |

## Behaviour

- Fetches the enrichment index from `/enrichment/enrichment.json`
- Matches fragments by current product SKU (from URL) or category (from PLP block `urlpath`)
- Loads and injects all matching fragments inline
- Single-section fragments replace the block; multi-section fragments are inserted after the block's section
- Block wrapper is removed after decoration (except in Universal Editor)

## Error Handling

- Logs errors silently — page renders without enrichment if no match found or fetch fails

## Dependencies

- `fragment` block — `loadFragment()`
- `scripts/commerce.js` — `getProductSku()`, `fetchIndex()`, `IS_UE`
