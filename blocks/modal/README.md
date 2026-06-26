# Modal Block

## Overview

A utility block that provides a reusable modal dialog component. Not authored directly — used programmatically by other blocks (e.g. mini-cart, login, product quick-view) via the `createModal` export.

## Usage

```javascript
import createModal from '../modal/modal.js';

const { showModal, removeModal } = await createModal(contentNodes);
showModal();
```

## API

| Method | Description |
|---|---|
| `showModal()` | Opens the modal dialog and focuses the first input if present |
| `removeModal()` | Closes and removes the modal from the DOM |

## Configuration

No authored configuration — fully controlled via JavaScript API.

## Behaviour

- Closes on click outside the dialog (mouse only)
- Closes on native `<dialog>` close event (Escape key)
- Resets scroll position on reopen (Chrome bug workaround)
- Unmounts any dropin containers rendered inside on close
- Adds `modal-open` class to `<body>` while open to allow scroll-lock styles

## Accessibility

- Uses native `<dialog>` element with `role="dialog"`
- Close button has `aria-label="Close"`
- Auto-focuses first `<input>` inside the modal when content loads
- `tabindex="1"` set on dialog for keyboard navigation
