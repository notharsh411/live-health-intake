import { Type, type FunctionDeclaration, type Tool } from "@google/genai";

export const UPDATE_INTAKE_SUMMARY = "update_intake_summary";
export const COMPLETE_INTAKE = "complete_intake";
export const SET_TRIAGE_LEVEL = "set_triage_level";

export type TriageLevel = "routine" | "soon" | "urgent";

export type IntakeSummary = {
  chief_complaint?: string;
  onset?: string;
  duration?: string;
  severity_0_10?: number;
  associated_symptoms?: string[];
  current_medications?: string[];
  allergies?: string[];
  red_flags?: string[];
  missing_information?: string[];
  clinician_notes?: string;
  triage_level?: TriageLevel;
  visual_findings?: string;
};

export const emptyIntakeSummary = (): IntakeSummary => ({});

export const REQUIRED_FOR_COMPLETE: (keyof IntakeSummary)[] = [
  "chief_complaint",
  "duration",
  "severity_0_10",
];

export function hasRequiredFields(summary: IntakeSummary): boolean {
  return REQUIRED_FOR_COMPLETE.every((key) => {
    const value = summary[key];
    if (value === undefined || value === null || value === "") return false;
    return true;
  });
}

export const updateIntakeSummaryDeclaration = {
  name: UPDATE_INTAKE_SUMMARY,
  description:
    "Update the structured clinical intake summary with new facts learned from the conversation or from a clear camera view. Call this after each new piece of information. Only include fields that changed or were newly confirmed. For visual_findings, only include unmistakable camera observations — never invent or copy spoken symptom text into visual_findings.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      chief_complaint: {
        type: Type.STRING,
        description: "Primary reason for visit in the patient's words.",
      },
      onset: {
        type: Type.STRING,
        description: "When symptoms started.",
      },
      duration: {
        type: Type.STRING,
        description: "How long symptoms have lasted.",
      },
      severity_0_10: {
        type: Type.NUMBER,
        description: "Patient-reported severity from 0 to 10.",
      },
      associated_symptoms: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Other symptoms mentioned.",
      },
      current_medications: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Medications the patient currently takes.",
      },
      allergies: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Known drug or food allergies.",
      },
      red_flags: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Urgent symptoms such as chest pain or difficulty breathing.",
      },
      missing_information: {
        type: Type.ARRAY,
        items: { type: Type.STRING },
        description: "Important fields still needed before handoff.",
      },
      clinician_notes: {
        type: Type.STRING,
        description: "Brief notes for the clinician, not shown to the patient.",
      },
      visual_findings: {
        type: Type.STRING,
        description:
          "Camera-only observations of a clear medication label, skin lesion/rash/wound, or document in frame. Never invent. Never copy spoken symptoms here. Omit this field unless the finding is unmistakable in the video.",
      },
    },
  },
} satisfies FunctionDeclaration;

export const setTriageLevelDeclaration = {
  name: SET_TRIAGE_LEVEL,
  description:
    "Set a single urgency triage level for the clinician queue. Call once you have enough context, and update if urgency clearly changes. Use urgent for red-flag emergencies, soon for same-day or next-day concern, routine otherwise.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      level: {
        type: Type.STRING,
        description: "One of: routine, soon, urgent.",
        enum: ["routine", "soon", "urgent"],
      },
      reason: {
        type: Type.STRING,
        description: "Short clinical reason for the triage level.",
      },
    },
    required: ["level"],
  },
} satisfies FunctionDeclaration;

export const completeIntakeDeclaration = {
  name: COMPLETE_INTAKE,
  description:
    "Signal that enough information has been collected and the intake is ready for clinician handoff. Only call when chief complaint, duration, and severity are confirmed, and you have asked about red flags.",
  parameters: {
    type: Type.OBJECT,
    properties: {
      ready: {
        type: Type.BOOLEAN,
        description: "True when intake is complete.",
      },
    },
    required: ["ready"],
  },
} satisfies FunctionDeclaration;

export const intakeTools: Tool[] = [
  {
    functionDeclarations: [
      updateIntakeSummaryDeclaration,
      setTriageLevelDeclaration,
      completeIntakeDeclaration,
    ],
  },
];

export function mergeIntakeSummary(
  current: IntakeSummary,
  update: IntakeSummary
): IntakeSummary {
  return {
    ...current,
    ...Object.fromEntries(
      Object.entries(update).filter(([, value]) => value !== undefined)
    ),
  };
}

export function changedSummaryKeys(
  previous: IntakeSummary,
  next: IntakeSummary
): string[] {
  const keys = new Set([
    ...Object.keys(previous),
    ...Object.keys(next),
  ]) as Set<keyof IntakeSummary>;
  const changed: string[] = [];
  for (const key of keys) {
    const a = previous[key];
    const b = next[key];
    if (JSON.stringify(a) !== JSON.stringify(b) && b !== undefined) {
      changed.push(String(key));
    }
  }
  return changed;
}

export const INTAKE_STORAGE_KEY = "health-intake-summary";
export const TRANSCRIPT_STORAGE_KEY = "health-intake-transcript";
export const RECORDING_STORAGE_KEY = "health-intake-recording";
export const SESSION_META_KEY = "health-intake-meta";
export const TRIAGE_REASON_KEY = "health-intake-triage-reason";
