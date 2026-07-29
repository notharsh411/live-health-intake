# Live Health Intake Assistant

Real-time voice health intake built for the NSOffice.AI internship assignment. A patient describes symptoms out loud; Gemini Live asks focused follow-ups and updates a structured clinician summary via tool calling mid-conversation.

**Why this idea:** tool calling during a live voice session is a clear demo of what Gemini Live is good at, beyond a plain chatbot. The handoff note is the client-facing artifact.

## Links

- **Live demo (no local install):** [https://health-intake-eta.vercel.app](https://health-intake-eta.vercel.app)
- **Classic V1 homepage:** [https://health-intake-eta.vercel.app/v1](https://health-intake-eta.vercel.app/v1)
- **GitHub:** [https://github.com/notharsh411/live-health-intake](https://github.com/notharsh411/live-health-intake)
- **Anchor docs (for new chats):** [`docs/context.md`](docs/context.md), [`docs/project-overview.md`](docs/project-overview.md), [`docs/changelog.md`](docs/changelog.md)

Phone or any browser: open the live demo URL over HTTPS, allow the microphone, and start intake. You do not need the repo, Node, or a local API key. The server holds `GEMINI_API_KEY` on Vercel.

## Features

- Live audio conversation with `gemini-3.1-flash-live-preview` (listen, speak, barge-in)
- `update_intake_summary` tool calls fill the summary panel while the patient talks
- `set_triage_level` tool shows a routine / soon / urgent badge for clinicians
- Optional camera grounding for medication labels or skin findings (user opt-in)
- Language modes (English, Hindi, Hinglish) and specialty templates (General, ENT, Cardio, Peds)
- Live field pulses + reviewer replay at `/replay`
- Conversation start gate and locked finish until the assistant completes follow-ups
- Optional clinician note polish with `gemini-3-flash-preview`
- NSOffice Glass UI: Electric Blue, DM Sans, aurora + liquid glass Decision Bar
- API key stays on the server; the browser receives a short-lived ephemeral token

## Stack

- Next.js (App Router) + TypeScript
- `@google/genai` Live API + Auth Tokens
- AudioWorklet PCM capture (16 kHz in) / playback (24 kHz out)
- NSOffice Glass UI kit (`tokens.css`, `liquid-glass.js`)

## Prerequisites

- Node.js 20+
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (free tier; no billing required)
- Microphone permission in the browser
- Chrome recommended for full liquid-glass refraction (Safari/Firefox get a frosted fallback)

## Setup

```bash
cd health-intake
cp .env.example .env.local
# Edit .env.local and set GEMINI_API_KEY
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment variables

| Variable | Required | Default | Description |
| --- | --- | --- | --- |
| `GEMINI_API_KEY` | Yes | | Google AI Studio API key (server only) |
| `GEMINI_LIVE_MODEL` | No | `gemini-3.1-flash-live-preview` | Live API model |
| `GEMINI_TEXT_MODEL` | No | `gemini-3-flash-preview` | Turn-based model for clinician note export |
| `GEMINI_LIVE_VOICE` | No | `Aoede` | Prebuilt Live voice name |

Never commit `.env` or `.env.local`. Both are covered by `.gitignore`.

## Scripts

```bash
npm run dev      # local development
npm run build    # production build
npm run start    # serve production build
```

## How it works

1. **Landing:** hero with aurora mesh and glass Decision Bar; primary action starts intake.
2. **Intake:** browser requests `POST /api/live-token`, connects to Gemini Live with the ephemeral token, streams mic PCM, plays model audio, and applies `update_intake_summary` / `complete_intake` tool calls to React state.
3. **Handoff:** structured fields plus an optional polished note from `POST /api/summary/export`; copy or download JSON.

## Deploy on Vercel

1. Push this repo to GitHub.
2. Import the project in Vercel (root directory: `health-intake` if the repo parent contains other folders, or the repo root if this folder is the repo).
3. Add `GEMINI_API_KEY` (and optional model overrides) in Project Settings → Environment Variables.
4. Deploy. The live URL needs HTTPS for microphone access.

## Disclaimer

Demo only. Not medical advice, diagnosis, or treatment. For emergencies, call your local emergency number.

## License

App code is part of the NSOffice internship submission. `liquid-glass.js` is MIT (see `public/liquid-glass.LICENSE`).
