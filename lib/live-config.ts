import {
  EndSensitivity,
  MediaResolution,
  Modality,
  StartSensitivity,
  type LiveConnectConfig,
} from "@google/genai";
import { intakeTools } from "./intake-schema";

export const DEFAULT_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";

export const DEFAULT_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL ?? "gemini-3-flash-preview";

export const SYSTEM_INSTRUCTION = `You are a warm, professional health intake assistant helping a patient describe symptoms before a doctor visit. This is a demo tool, not a diagnosis service.

Rules:
- Ask one clarifying question at a time. Keep spoken replies brief and conversational.
- Listen for chief complaint, onset, duration, severity (0-10), associated symptoms, medications, and allergies.
- After learning any new fact, call update_intake_summary with only the fields that changed.
- If the patient mentions chest pain, difficulty breathing, sudden severe headache, confusion, or similar urgent symptoms, note them in red_flags immediately and advise seeking emergency care if appropriate.
- Never diagnose or prescribe. You are gathering information only.
- When you have chief complaint, duration, and severity, ask if anything else should be noted, then call complete_intake with ready: true.
- Speak naturally. Allow interruptions. Confirm key details before ending.`;

export function createLiveConnectConfig(voiceName = "Aoede"): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    systemInstruction: SYSTEM_INSTRUCTION,
    temperature: 0.8,
    mediaResolution: MediaResolution.MEDIA_RESOLUTION_MEDIUM,
    tools: intakeTools,
    inputAudioTranscription: {},
    outputAudioTranscription: {},
    realtimeInputConfig: {
      automaticActivityDetection: {
        disabled: false,
        startOfSpeechSensitivity: StartSensitivity.START_SENSITIVITY_HIGH,
        endOfSpeechSensitivity: EndSensitivity.END_SENSITIVITY_LOW,
        prefixPaddingMs: 20,
        silenceDurationMs: 700,
      },
    },
  };
}
