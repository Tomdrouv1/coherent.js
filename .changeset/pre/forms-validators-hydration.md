---
"@coherent.js/forms": patch
---

Make `hydrateForm` enforce the validators the server rendered.

The builder wrote `data-validators` as each function's name, and
factory-built validators such as `validators.minLength(8)` are anonymous, so
they were all emitted as `custom` — which the client treated as always valid.
The client accepted a 3-character password that the server then rejected.

`data-validators` is now a JSON array of `{ name, args }`
(`[{"name":"minLength","args":[8]}]`, regular expressions included), and
`hydrateForm` rebuilds each rule through the same factory, so both sides give
the same verdict and message. Built-ins listed uncalled and validators added
with `registerValidator` are described by name (register the same name in the
browser to enforce one there). Anonymous functions are no longer emitted as
`custom`; they are enforced on the server only. `hydrateForm` still reads the
older comma-separated attribute (`required,minLength:8`), which also works
again: a parametrised entry used to call the direct-style validator as a
factory and was dropped.

**Behavior change:** the `data-validators` attribute value changed format.
