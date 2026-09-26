---
"@coherent.js/state": minor
---

Make persistent state safe to use.

- **The restore on creation no longer overwrites your first updates.** Stored
  state was restored asynchronously and merged over everything, so
  `setState({ qty: 5 })` right after creation ended as the stored `qty: 1` —
  and that was persisted. Keys set before the restore finishes now keep their
  new value, and the new `ready` promise resolves (to whether anything was
  restored) once it is done.
- **Failed writes are reported.** A throwing `setItem` (e.g.
  `QuotaExceededError`) was logged and then `onSave` fired anyway. It now goes
  to `onError`, `onSave` does not fire, and `save()` / `persist()` resolve to
  `false`.
- **`encrypt` is honest obfuscation.** It XORed the payload with the public
  default key `'default-key'` when none was given, and threw
  `InvalidCharacterError` for any character outside Latin-1 (`'日本'`). It now
  works on UTF-8 bytes, so any text round-trips, and is documented as
  obfuscation, not encryption.
- **`crossTab` syncs only the same store.** Every store shared one
  `BroadcastChannel`, so a cart update was merged into the user store, and a
  store applied its own broadcasts. The channel is now named after the storage
  key, messages carry a sender id, and the new `destroy()` closes it (and
  flushes a pending debounced save).
- **No shared storage on the server.** With Web Storage available in Node, a
  request restored the previous request's state. Browser backends are now
  inert when there is no `window`, and cross-tab sync is off; pass the new
  `adapter` option to persist on the server.

**Behavior change:** `encrypt: true` without an `encryptionKey` throws a
`TypeError`. Data stored with `encrypt` by an earlier version that contains
non-ASCII characters cannot be read back and is reported through `onError`.
On the server, `localStorage` / `sessionStorage` / `indexedDB` state is no
longer persisted or restored. Storage errors are passed to `onError` when it
is set, and only logged otherwise.
