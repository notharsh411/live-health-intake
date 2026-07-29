# Context (attach this to new chats)

Last updated: 2026-07-29

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
| `/api/live-token` | Server mints ephemeral Gemini Live token (API key never in browser) |
| `/api/summary/export` | Optional note polish via `gemini-3-flash-preview` |

## Non-negotiables

- NSOffice Glass UI: Electric Blue `#0000FE`, DM Sans, Decision Bar, no emoji, no em dashes in copy
- Secrets only in `.env.local` (gitignored) and Vercel env. Never commit keys.
- Phone users open the Vercel URL only. No local repo or local API key required; mic + HTTPS required.

## Active work / latest decisions

- Homepage **V2** is default on `/` (problem narrative + product showcase)
- Homepage **V1** preserved at `/v1` for fallback
- Anchor docs live in `docs/` and must be updated after each meaningful change
- Global skills: `~/.cursor/skills` → `~/.agents/skills`
- Remote phone/desktop users only need the Vercel URL + mic; API key is on Vercel

## Attach in a new chat

Prefer attaching:

1. `docs/context.md` (this file)
2. `docs/project-overview.md`
3. `docs/changelog.md` (recent slice)

Then say: "Continue from these anchors."
