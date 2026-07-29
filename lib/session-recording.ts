import type { IntakeSummary, TriageLevel } from "./intake-schema";
import type { SessionOptions } from "./session-options";

export type RecordingEvent =
  | {
      t: number;
      type: "system";
      text: string;
    }
  | {
      t: number;
      type: "transcript";
      role: "user" | "assistant" | "system";
      text: string;
    }
  | {
      t: number;
      type: "fields";
      keys: string[];
      summary: IntakeSummary;
    }
  | {
      t: number;
      type: "triage";
      level: TriageLevel;
      reason?: string;
    }
  | {
      t: number;
      type: "complete";
    };

export type SessionRecording = {
  startedAt: number;
  options: SessionOptions;
  events: RecordingEvent[];
};

export function createRecording(options: SessionOptions): SessionRecording {
  return {
    startedAt: Date.now(),
    options,
    events: [
      {
        t: 0,
        type: "system",
        text: "Recording started for reviewer replay.",
      },
    ],
  };
}

export function appendRecordingEvent(
  recording: SessionRecording,
  event: RecordingEvent
): SessionRecording {
  return {
    ...recording,
    events: [...recording.events, event],
  };
}
