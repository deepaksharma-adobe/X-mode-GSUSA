# Targeted Block

## Overview

Renders personalised content based on customer segments, customer groups, or cart rules using the Adobe Commerce Personalization dropin. Shows or hides content depending on the current shopper's context.

## Authored Structure

| Key | Value |
|---|---|
| `type` | Personalisation type identifier |
| `fragment` | (optional) path to a fragment to load as content |
| `customer-segments` | Comma-separated segment IDs |
| `customer-groups` | Comma-separated customer group IDs |
| `cart-rules` | Comma-separated cart rule IDs |

## Configuration

| Option | Description |
|---|---|
| `type` | Identifies which personalisation rule type to apply |
| `fragment` | If set, loads a fragment as the block content; otherwise uses the last child row |
| `customer-segments` | IDs are base64-encoded before passing to the dropin |
| `customer-groups` | IDs are base64-encoded before passing to the dropin |
| `cart-rules` | IDs are base64-encoded before passing to the dropin |

## Behaviour

- IDs are base64-encoded before being passed to the personalisation engine
- Uses `TargetedBlock` container from `@dropins/storefront-personalization`
- Content slot replaces the block with personalised or default content

## Dependencies

- `fragment` block — `loadFragment()`
- `@dropins/storefront-personalization` — `TargetedBlock`, `render`
