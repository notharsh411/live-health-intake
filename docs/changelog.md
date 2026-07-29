# Changelog

## 2026-07-29 (PDF handoff)

- Branded PDF report on `/handoff` (Electric Blue header, triage badge, clinician note, structured fields, disclaimer)
- Download PDF + native Share sheet (email / WhatsApp / Files) when the browser supports file sharing
- Client-side generation via `jspdf` in `lib/handoff-pdf.ts` (no server secrets in the PDF path)

## 2026-07-29 (camera UX)

- Camera opens in preview-only mode; frames are not sent until “I’m showing it now”
- Front / rear camera flip for phones; front preview mirrored
- Prompt: ignore ambient room/face until a med label, skin, or document is clearly presented

## 2026-07-29 (brand + hardening)

- Official NSOffice.AI logo/favicon from nsoffice.ai under `public/brand/`
- Brand header across pages; glass kit tokens unchanged (Electric Blue remains)
- Production hardening: middleware CSP/HSTS, API origin checks, rate limits, body limits, sanitization, error boundary
- Screen-sleep fix: Wake Lock, visibility autosave, interrupted state with saved handoff path
- Added `docs/security.md`

## 2026-07-29 (evening features)

- Camera / document grounding: optional prompt to share medication or skin area (~1 fps JPEG)
- Demo wows: live field pulses on tool updates; `/replay` reviewer session recording
- Product depth: English / Hindi / Hinglish + General / ENT / Cardio / Peds templates
- Triage: `set_triage_level` tool with routine / soon / urgent badge on summary
- UX fix: "I'm ready to speak" gate; Finish locked until `complete_intake`

## 2026-07-29 (later)

- Requirements audit: all "What We Need To See" checklist items met
- Added V2 story homepage with V1 fallback; mobile hardening; anchor docs
- Confirmed remote demo path: Vercel URL works without local clone or local API key
- Earlier: Live intake, tool calling, handoff export, GitHub + Vercel, env secrets on Vercel

## 2026-07-29

- Added anchor docs: `docs/context.md`, `docs/project-overview.md`, `docs/changelog.md`
- Preserved original homepage as `/v1`
- Shipped V2 homepage on `/` with problem narrative and product showcase
- Hardened mobile layout for landing, intake, and handoff
- Confirmed remote demo path: Vercel URL works without local clone or local API key
- Earlier: Live intake, tool calling, handoff export, GitHub + Vercel, env secrets on Vercel
