---
"@coherent.js/client": patch
---

Don't fail hash navigations for want of a DOM.

- **Fixed:** navigating to a path with a `#hash` scrolled with `document.querySelector(hash)` after the route was committed; without a DOM that threw, and `push()` returned `false` although the route had changed. Scrolling is skipped without a DOM, and hash targets are found with `getElementById`, which also works for ids that aren't valid selectors (`#123`).
