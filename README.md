# Live Health Intake Assistant

Real-time voice health intake built for the NSOffice.AI internship assignment. A patient describes symptoms out loud; Gemini Live asks focused follow-ups and updates a structured clinician summary via tool calling mid-conversation.

**Why this idea:** tool calling during a live voice session is a clear demo of what Gemini Live is good at, beyond a plain chatbot. The handoff note is the client-facing artifact.

## Links

- **Live demo (no local install):** [https://health-intake-eta.vercel.app](https://health-intake-eta.vercel.app)
- **Classic V1 homepage:** [https://health-intake-eta.vercel.app/v1](https://health-intake-eta.vercel.app/v1)
- **GitHub:** [https://github.com/notharsh411/live-health-intake](https://github.com/notharsh411/live-health-intake)
- **Deeper docs:** [`docs/project-overview.md`](docs/project-overview.md), [`docs/context.md`](docs/context.md), [`docs/security.md`](docs/security.md), [`docs/changelog.md`](docs/changelog.md)

Phone or any browser: open the live demo URL over HTTPS, allow the microphone, and start intake. You do not need the repo, Node, or a local API key. The server holds `GEMINI_API_KEY` on Vercel.

## Assignment features

Mapped to **What We Need To See** and idea **5. Live Health Intake Assistant** in the NSOffice internship assignment brief.

### Brief requirements

- Gemini API on the free tier (no billing required)
- Real-time voice on Live model `gemini-3.1-flash-live-preview` (listen, speak, barge-in over a live connection)
- Turn-based / text step on `gemini-3-flash-preview` for clinician note polish
- API key only in environment variables; never committed (`.env*` gitignored)
- NSOffice Glass UI on every screen: Electric Blue `#0000FE`, DM Sans, Apple-style spacing, one primary action per view
- Kit assets in use: `tokens.css` and `liquid-glass.js`
- Public GitHub repository with a clear README (description, setup, env vars, local commands)
- Public Vercel deploy so the demo works with no local setup

### Health intake idea (from the brief)

- Patient describes symptoms out loud before a consultation
- Assistant asks natural follow-up questions to fill gaps
- Mid-conversation **tool calling** updates a structured doctor handoff (`update_intake_summary`, `complete_intake`)
- Clinician sees a structured summary after the session (handoff note + fields)

## Added features

Beyond the assignment checklist:

- **Triage badge** via `set_triage_level` (`routine` / `soon` / `urgent`) with reason on the summary
- **Language modes:** English, Hindi, Hinglish
- **Specialty templates:** General, ENT, Cardio, Peds
- **Session gates:** Connect → I'm ready to speak; Finish locked until `complete_intake`
- **Optional camera grounding:** preview first, flip front/rear, then I'm showing it now; vision honesty when camera is off; aim delay and frame quality gates
- **Live field pulses** when tool calls update summary fields
- **Reviewer replay** at `/replay` (last session recording, no mic)
- **Branded PDF handoff:** download + native share (email / WhatsApp / Files), plus copy note and JSON export
- **Screen-sleep resilience:** Wake Lock, autosave, interrupted state with saved handoff path

## Stack

- Next.js (App Router) + TypeScript
- `@google/genai` Live API + Auth Tokens
- AudioWorklet PCM capture (16 kHz in) / playback (24 kHz out)
- NSOffice Glass UI kit (`tokens.css`, `liquid-glass.js`)

## Project map

| Path | What it does |
| --- | --- |
| `app/page.tsx` | V2 landing |
| `app/v1/page.tsx` | Classic landing fallback |
| `app/intake/page.tsx` | Live session UI shell |
| `app/handoff/page.tsx` | Clinician note, PDF, copy, JSON |
| `app/replay/page.tsx` | Reviewer playback of last recording |
| `app/api/live-token/route.ts` | Mints ephemeral Live token (API key stays server-side) |
| `app/api/summary/export/route.ts` | Polishes clinician note with text model |
| `hooks/use-live-intake.ts` | Mic, Live socket, tools, camera, wake lock |
| `lib/intake-schema.ts` | Tool declarations + summary merge |
| `lib/live-config.ts` | Live connect config + model defaults |
| `lib/session-options.ts` | Language / specialty system prompt |
| `lib/handoff-pdf.ts` | Branded PDF builder |
| `components/` | UI pieces (session panel, summary card, brand header) |
| `public/tokens.css`, `public/liquid-glass.js` | NSOffice Glass kit assets |
| `middleware.ts` | Security headers + scanner path blocks |

## Prerequisites

- Node.js 20+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier; no billing required)
- Microphone permission in the browser
- Chrome recommended for full liquid-glass refraction (Safari/Firefox get a frosted fallback)

## Setup

This GitHub repo is the Next.js app root (there is no nested `health-intake/` folder in the public repo).

```bash
git clone https://github.com/notharsh411/live-health-intake.git
cd live-health-intake
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY=...
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Quick local demo path

1. Open `/` → **Start voice intake**
2. Pick language + specialty → **Connect session**
3. Tap **I'm ready to speak**, complete a short intake
4. Review `/handoff` (PDF / copy / JSON) and optionally `/replay`

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes | | Google AI Studio API key (server only) |
| `GEMINI_LIVE_MODEL` | No | `gemini-3.1-flash-live-preview` | Live API model |
| `GEMINI_TEXT_MODEL` | No | `gemini-3-flash-preview` | Turn-based model for clinician note export |
| `GEMINI_LIVE_VOICE` | No | `Aoede` | Live voice name |
| `ALLOWED_ORIGINS` | No | | Extra comma-separated origins allowed to call APIs |

Never commit `.env` or `.env.local`. Both are covered by `.gitignore`.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
npm run lint     # eslint
```

## How it works

1. **Landing:** hero with aurora mesh and glass Decision Bar; primary action starts intake.
2. **Intake:** browser requests `POST /api/live-token`, connects to Gemini Live with the ephemeral token, streams mic PCM, plays model audio, and applies `update_intake_summary` / `set_triage_level` / `complete_intake` tool calls to React state.
3. **Handoff:** structured fields plus an optional polished note from `POST /api/summary/export`; download a branded PDF (or share via the system sheet), copy text, or download JSON.

Session state (summary, transcript, recording) is kept in `sessionStorage` so handoff and replay work after navigation or an interrupted call.

## Deploy on Vercel

1. Push this repo to GitHub (already public for this submission).
2. Import the project in Vercel. **Root Directory** should be the repo root (`.`), not a nested folder.
3. Add `GEMINI_API_KEY` (and optional model overrides) in Project Settings → Environment Variables.
4. Deploy. The live URL needs HTTPS for microphone access.

## Troubleshooting

| Symptom | Likely fix |
| --- | --- |
| Mic button fails / no audio | Use HTTPS (or localhost), allow mic permission, prefer Chrome |
| `Could not create token` / 500 on `/api/live-token` | Set `GEMINI_API_KEY` in `.env.local` (local) or Vercel env (prod), then restart/redeploy |
| Camera says it can see you when off | Expected only after **I'm showing it now**; start a fresh session if an old tab is stale |
| Screen sleeps mid-intake | Summary autosaves; open **Open saved handoff** or reconnect |
| Glass looks flat | Safari/Firefox use frosted fallback; Chrome shows liquid refraction |

## Disclaimer

Demo only. Not medical advice, diagnosis, or treatment. For emergencies, call your local emergency number.

## License

App code is part of the NSOffice internship submission. `liquid-glass.js` is MIT (see `public/liquid-glass.LICENSE`).
