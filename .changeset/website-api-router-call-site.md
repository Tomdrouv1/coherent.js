---
"coherent-website": patch
---

Hand only `/api/` requests to the API router in the website's Express server.

`router.handle()` answers every request it is given, with a JSON 404 when no route matches, and resolves to `undefined`. The server treated a falsy result as "not handled" and called `next()` after the response had been sent, and every URL that reached that middleware got the router's JSON 404. Requests outside `/api/` now continue down the Express chain, and router errors go to Express's error handler.

- New `TRUST_PROXY` environment variable: the number of reverse proxies in front of the server. It sets Express's `trust proxy` and the API router's `trustProxy`, so the docs, playground and API rate limits key on the real client address instead of giving every client behind a proxy one shared budget. Unset, both key on the connecting address.
- The unreachable `/__playground` entry in the API router (the Express route serves `POST /__playground/run`), which rate-limited on a client-supplied `X-Forwarded-For`, is removed.
- `express.json()` now only parses the playground route's body instead of running in front of the API router, which reads request bodies itself.
