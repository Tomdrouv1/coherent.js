---
"@coherent.js/client": patch
---

Read component trees the way the server renders them.

- **Fixed:** an object with several tag keys, such as `{ span: { text: 'label' }, button: { text: 'Go', onclick } }`, renders on the server as sibling elements, but `hydrate()` and the patcher read only its first key. Every following element shifted by one: clicking the button ran the next element's handler, and a re-render dropped the button. Each key is now its own element, in key order. Objects with a key that is not a tag name (`{ my_tag: ... }`) render nothing on the client either, and `lazy()` values render what they evaluate to, as on the server.
- **Fixed:** re-renders wrote `className: ['btn', active && 'active']` as `class="btn,false"` and `className: { active: true }` as `class="[object Object]"`, ignored `class` when `className` was also given, and removed `aria-*` attributes and `spellcheck`, `draggable` and `contenteditable` set to `false`. They now produce what the server renders: `class="btn"`, `class="active"`, one merged class attribute, and `aria-hidden="false"` / `spellcheck="false"`.
- **Fixed:** `text: null` rendered the string "null" on the client, both when creating elements and when patching (`text: 'Save'` → `text: null` wrote "null" into the button). It now renders no text, as on the server.
- **Fixed:** mismatch detection (in development, with `strict` or with `onMismatch`) reported mismatches for these trees although the server and client output were identical, and `strict: true` threw for them.
