---
"@coherent.js/core": minor
---

Stop leaking server-side event handlers into a global registry.

- **Fixed (memory leak):** every function-valued `on*` prop was stored in `global.__coherentActionRegistry` under a `Date.now()` + `Math.random()` id and never removed — 50,000 renders kept 50,000 closures (and whatever request data they captured). Nothing read the registry: the id pointed at server memory the browser never sees, and `@coherent.js/client`'s `hydrate()` attaches handlers from the component tree.
- **Fixed:** the random ids made two renders of the same component produce different HTML, which defeated ETags, HTML caching and hydration comparisons.
- **Behavior change:** function-valued `on*` props now render no attribute (previously `data-action="__coherent_action_…" data-event="…"`). Inline string handlers (`onclick: 'history.back()'`) and hand-written `data-action` attributes for the event bus are unchanged.
