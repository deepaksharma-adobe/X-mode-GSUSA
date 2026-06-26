# Accordion Block

## Overview

Displays collapsible content sections using the native HTML `<details>`/`<summary>` elements. Each row in the authored table becomes an accordion item.

## Authored Structure

| Column 1 | Column 2 |
|---|---|
| Item label (summary) | Item body content |
| Item label (summary) | Item body content |

## Behaviour

- Each row becomes a `<details>` element with a `<summary>` for the label
- Multiple items can be open simultaneously (native browser behaviour)
- No JavaScript state management — relies on native `<details>` toggle

## Accessibility

- Uses native `<details>`/`<summary>` — keyboard accessible by default
- No additional ARIA attributes required
