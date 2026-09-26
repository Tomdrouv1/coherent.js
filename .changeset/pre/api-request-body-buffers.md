---
"@coherent.js/api": patch
---

Request bodies are decoded correctly and body parsing always settles.

- The router decoded each incoming chunk separately, so a multibyte UTF-8 character split across two TCP chunks (`ë`, `日`...) arrived as replacement characters. Chunks are now collected as Buffers and decoded once.
- A request stream that closes or aborts before the body ends settles `handle()` instead of leaving it pending forever, and no response is attempted for a client that is gone.
- A `Content-Length` above `maxBodySize` is answered with 413 before the body is read, and a 413 closes the connection instead of reading the rest of the upload.
