# Columns Block

## Overview

Arranges content into a multi-column layout. Automatically adds a CSS class based on the number of columns authored, and detects image-only columns for special styling.

## Authored Structure

| Column 1 | Column 2 | Column N |
|---|---|---|
| Any content | Any content | Any content |

## Behaviour

- Adds class `columns-{n}-cols` based on number of columns (e.g. `columns-2-cols`)
- Columns containing only an image get the `columns-img-col` class for image-specific styling

## CSS Classes

| Class | Applied when |
|---|---|
| `columns-{n}-cols` | Always — based on column count |
| `columns-img-col` | Column contains only a `<picture>` element |
