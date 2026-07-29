import { Type, type FunctionDeclaration, type Tool } from "@google/genai";

export const UPDATE_INTAKE_SUMMARY = "update_intake_summary";
export const COMPLETE_INTAKE = "complete_intake";

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
};

export const emptyIntakeSummary = (): IntakeSummary => ({});

export const updateIntakeSummaryDeclaration = {
  name: UPDATE_INTAKE_SUMMARY,
  description:
    "Update the structured clinical intake summary with new facts learned from the conversation. Call this after each new piece of information. Only include fields that changed or were newly confirmed.",
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
    },
  },
} satisfies FunctionDeclaration;

export const completeIntakeDeclaration = {
  name: COMPLETE_INTAKE,
  description:
    "Signal that enough information has been collected and the intake is ready for clinician handoff.",
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

export const INTAKE_STORAGE_KEY = "health-intake-summary";
export const TRANSCRIPT_STORAGE_KEY = "health-intake-transcript";
