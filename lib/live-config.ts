import {
  EndSensitivity,
  MediaResolution,
  Modality,
  StartSensitivity,
  type LiveConnectConfig,
} from "@google/genai";
import { intakeTools } from "./intake-schema";
import {
  buildSystemInstruction,
  type SessionOptions,
} from "./session-options";

export const DEFAULT_LIVE_MODEL =
  process.env.GEMINI_LIVE_MODEL ?? "gemini-3.1-flash-live-preview";

export const DEFAULT_TEXT_MODEL =
  process.env.GEMINI_TEXT_MODEL ?? "gemini-3-flash-preview";

export function createLiveConnectConfig(
  voiceName = "Aoede",
  options: SessionOptions = { language: "en", specialty: "general" }
): LiveConnectConfig {
  return {
    responseModalities: [Modality.AUDIO],
    speechConfig: {
      voiceConfig: {
        prebuiltVoiceConfig: { voiceName },
      },
    },
    systemInstruction: buildSystemInstruction(options),
    temperature: 0.55,
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
