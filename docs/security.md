# Security notes

## Honest scope

No web app is “unbreakable.” This project is hardened for a public demo on Vercel free tier with defenses that match serious production practice for this architecture.

## Controls in place

- API key never leaves the server; browser gets short-lived ephemeral Live tokens only
- `.env*` gitignored; only `.env.example` committed
- Origin checks on API routes + optional `ALLOWED_ORIGINS`
- JSON body size limits and content-type checks
- Per-IP rate limits on `/api/live-token` and `/api/summary/export`
- Input sanitization before model prompts (export)
- Security headers via middleware: CSP, HSTS, frame deny, nosniff, permissions-policy
- Scanner path blocks (`wp-admin`, `.env`, `.php`)
- `poweredByHeader: false`
- Error boundary for UI crashes without dumping internals in production responses
- Screen Wake Lock + autosave so sleep does not silently discard clinician data

## Residual risks (known)

- In-memory rate limits are per serverless instance, not a global Redis limiter
- Client-held ephemeral tokens can still be abused until expiry if stolen from a compromised browser
- Wake Lock is best-effort; some phones ignore it. Autosave + interrupted handoff cover that case
- Gemini Live WebSocket depends on Google’s service availability and free-tier quotas

## Ops recommendations

- Rotate `GEMINI_API_KEY` if it was ever pasted into chat or logs
- Set `ALLOWED_ORIGINS` to the exact production hostname in Vercel
- Enable Vercel Deployment Protection / bot filtering for staging if needed
