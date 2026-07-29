# Context (attach this to new chats)

Last updated: 2026-07-29 (evening)

## What this project is

Live Health Intake Assistant for NSOffice.AI internship. Voice symptom intake via Gemini Live API; mid-conversation tool calling fills a clinician summary; handoff export.

## Live links

- Demo: https://health-intake-eta.vercel.app
- GitHub: https://github.com/notharsh411/live-health-intake
- Local app root: `health-intake/`

## Current product surface

| Route | Purpose |
| --- | --- |
| `/` | **V2 homepage** (story + product showcase). Default. |
| `/v1` | **V1 homepage** (original simple hero). Fallback if V2 regresses. |
| `/intake` | Live voice session + live summary card |
| `/handoff` | Clinician note + copy/download |
| `/replay` | Reviewer replay of last session recording (no mic) |
| `/api/live-token` | Server mints ephemeral Gemini Live token (API key never in browser) |
| `/api/summary/export` | Optional note polish via `gemini-3-flash-preview` |

## Session UX (important)

1. Pick **language** (English / Hindi / Hinglish) and **specialty** (General / ENT / Cardio / Peds)
2. **Connect session**
3. Tap **I'm ready to speak** to begin (mic stays muted until then)
4. Optional camera prompt: share medication / skin / document
5. **Finish stays locked** until the model calls `complete_intake`
6. Summary shows **live field pulses** + **triage badge** (`routine` / `soon` / `urgent`)

## Tools the model can call

- `update_intake_summary`
- `set_triage_level`
- `complete_intake` (gated on chief complaint, duration, severity)

## Non-negotiables

- NSOffice Glass UI: Electric Blue `#0000FE`, DM Sans, Decision Bar, no emoji, no em dashes in copy
- Official NSOffice wordmark from nsoffice.ai in `/public/brand/` (marketing site purple accents are not used; assignment kit keeps Electric Blue)
- Secrets only in `.env.local` (gitignored) and Vercel env. Never commit keys.
- Phone users open the Vercel URL only. No local repo or local API key required; mic + HTTPS required.
- Screen Wake Lock + interrupted handoff when sleep kills the live socket

## Security

See `docs/security.md`. Headers, rate limits, origin checks, body limits, sanitization. Not magical invulnerability; production-grade for this demo architecture.

## Attach in a new chat

1. `docs/context.md` (this file)
2. `docs/project-overview.md`
3. `docs/changelog.md`
