---
"@coherent.js/core": patch
---

Render the children of elements whose prop names don't look like tag names.

- **Fixed:** the renderer decided whether an element had children with `hasChildren()`, which first validates every prop name against the tag-name pattern. An element with a prop such as `@click`, `x-on:click`, `:class`, `xlink:href` or `data_id` therefore rendered with no children at all — `<button @click="save()"></button>` instead of `<button @click="save()"><span>Save</span></button>`.
