# Project overview

## Goal

Ship a client-demoable Live Health Intake experience that uses Gemini Live for real-time voice and tool calling, styled with the NSOffice Glass UI system, public on GitHub and Vercel.

## Problem we solve

Clinic visits often start cold. Patients fill paper or portal forms that miss nuance, or they retell the same story under time pressure. The clinician opens the chart with incomplete onset, severity, meds, and red flags.

## Solution

The patient speaks. Gemini Live asks one clarifying question at a time, updates a structured intake summary via `update_intake_summary` while they talk, sets a triage badge via `set_triage_level`, optionally grounds on camera frames, then hands off a clinician-ready note.

## Why this idea (assignment)

Real-time voice plus mid-session tool calling is hard to fake with a plain chatbot. That is the differentiator for Gemini Live.

## Stack

- Next.js App Router + TypeScript
- `@google/genai` Live API + ephemeral auth tokens
- AudioWorklet 16 kHz PCM in / 24 kHz out
- NSOffice `tokens.css` + `liquid-glass.js`

## Models

- Live: `gemini-3.1-flash-live-preview`
- Text polish: `gemini-3-flash-preview`

## Design system

Follow `nsoffice-glass-ui-kit/SKILL.md`. Brand wins on color/type. Apple HIG on space/motion. Glass only on aurora or imagery.

## Homepage versions

- **V2 (`/`):** Narrative + product showcase. Primary CTA remains Start voice intake.
- **V1 (`/v1`):** Original short hero. Keep for fallback demos and regressions.

## Remote / phone use

Anyone with the Vercel URL can run the demo. Server holds `GEMINI_API_KEY`. Browser only needs mic permission over HTTPS. No local files required.
