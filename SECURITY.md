# Security notes (audited 2026-11-04, pre-submission)

Threat model: public demo judged from a video + repo; API key lives server-side only.
No user accounts, no database, no stored PII.

## What is enforced in code

- **Secrets stay server-side.** `META_API_KEY` is read only in API routes (`src/lib/meta.ts`,
  imported exclusively by `src/app/api/*`). No client component references it; `next build`
  never inlines it. `.env.local` is git-ignored and was verified absent from history.
- **Input validation everywhere.** All POST routes validate with zod (enums, length caps,
  collection caps of ≤8 items). Unknown JSON is rejected with 400.
- **Body caps before parsing.** `Content-Length` is checked before buffering (17 MB image
  routes, 500 KB text routes; 413 on overflow), so oversized bodies can't exhaust memory
  in the JSON parser or validator.
- **Rate limits per IP** (`src/lib/rate-limit.ts`, sliding window, 429 + `Retry-After`):
  analyze 12, SAM 24, texture 30, ask/recommend 40 per 10 minutes. Protects Meta API spend.
  Best-effort on serverless (per-instance memory); pair with provider quotas in production.
- **No XSS sinks.** No `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `new Function`
  anywhere in `src/`. Model output (room names, notes, answers) renders as React text.
- **No SSRF.** The server never fetches remote URLs. Uploads are base64 payloads decoded
  by the Meta API, not by us.
- **Security headers** (`next.config.mjs`): `nosniff`, strict referrer policy,
  `X-Frame-Options: DENY`, camera/mic/geolocation disabled.
- **No auth theater.** The demo is intentionally public; the README states that production
  deployment needs authentication + quotas. Rate limits + body caps are the interim control.
- **Safe failures.** Live API failures return 502/503 and never substitute sample data;
  the Q&A fallback is labeled on-device output with no compliance claims.

## Dependency audit (`npm audit`, production)

- `next@14.2.35` (latest 14.2.x; no newer patch exists): the flagged advisories target
  features this app does not use or expose — Image Optimization (`next/image` unused, no
  `remotePatterns`), Server Actions (`use server` unused), Middleware (none), i18n (none),
  CSP nonces (none), rewrites (none), WebSockets (none). No user-specific cached responses.
  Upgrading to Next 15 was deliberately deferred past the submission deadline: a major
  migration now risks breaking the demo for advisories with no reachable sink here.
- `postcss` (nested 8.4.31 under Next): build-time CSS parser issue. Attacker CSS cannot
  reach the compiler at runtime (styles are repo source files). An override was attempted
  and reverted to keep the verified dependency tree intact for submission.
- `zod@3.23.8` (GHSA-mrhx-c7xc-m3w5, oversized constrained collections): our schemas cap
  collections at ≤8 short items and strings at fixed maxima, with byte caps enforced
  before parsing — the vulnerable pattern (unbounded attacker collections) is unreachable.
  A zod v4 migration is likewise deferred past submission (major-version behavior changes).

## Residual risks (accepted for the hackathon)

- No authentication: anyone with the URL can spend API budget within rate limits.
- In-memory rate limiting does not coordinate across serverless instances.
- WebGL fingerprinting / localStorage autosave are inherent to the client features.
