export type IntakeLanguage = "en" | "hi" | "hinglish";
export type IntakeSpecialty = "general" | "ent" | "cardio" | "peds";

export type SessionOptions = {
  language: IntakeLanguage;
  specialty: IntakeSpecialty;
};

export const LANGUAGE_OPTIONS: {
  id: IntakeLanguage;
  label: string;
  hint: string;
}[] = [
  { id: "en", label: "English", hint: "Default" },
  { id: "hi", label: "Hindi", hint: "हिन्दी" },
  { id: "hinglish", label: "Hinglish", hint: "Mix freely" },
];

export const SPECIALTY_OPTIONS: {
  id: IntakeSpecialty;
  label: string;
  focus: string;
}[] = [
  {
    id: "general",
    label: "General",
    focus: "broad primary-care intake",
  },
  {
    id: "ent",
    label: "ENT",
    focus:
      "ear, nose, throat: hearing, sinus, sore throat, ear pain, nasal blockage, voice changes",
  },
  {
    id: "cardio",
    label: "Cardio",
    focus:
      "chest pain character, radiation, dyspnea, palpitations, syncope, orthopnea, edema, cardiac history",
  },
  {
    id: "peds",
    label: "Peds",
    focus:
      "age-appropriate history with caregiver: fever pattern, feeding, urine output, immunization context, activity, rash",
  },
];

export function languageInstruction(language: IntakeLanguage): string {
  switch (language) {
    case "hi":
      return "Speak primarily in clear Hindi. Keep medical terms simple. The patient may mix English words.";
    case "hinglish":
      return "Speak in natural Hinglish. Match the patient's mix of Hindi and English.";
    default:
      return "Speak in clear, plain English.";
  }
}

export function specialtyInstruction(specialty: IntakeSpecialty): string {
  const option =
    SPECIALTY_OPTIONS.find((item) => item.id === specialty) ??
    SPECIALTY_OPTIONS[0];
  return `Specialty focus: ${option.label}. Prioritize questions about ${option.focus}.`;
}

export function buildSystemInstruction(options: SessionOptions): string {
  return `You are a warm, professional health intake assistant helping a patient describe symptoms before a doctor visit. This is a demo tool, not a diagnosis service.

${languageInstruction(options.language)}
${specialtyInstruction(options.specialty)}

Conversation flow:
- After the session starts, greet briefly and invite the patient to describe what brought them in.
- Ask one clarifying question at a time. Keep spoken replies brief.
- This is a continuous live conversation, not a turn-based form. Do not tell the patient to "submit" or "end" after their first answer. Keep asking follow-ups until the intake is complete.
- Collect chief complaint, onset, duration, severity (0-10), associated symptoms, medications, allergies, and red flags.
- After learning any new fact, call update_intake_summary with only the fields that changed.
- Call set_triage_level once you can judge urgency (routine, soon, or urgent), and update it if urgency clearly changes. Urgent is for emergency red flags.
- If the patient shares camera or a document, describe factual visual findings in visual_findings and any meds you can read into current_medications. Never invent label text you cannot read.
- If the patient mentions chest pain, difficulty breathing, sudden severe headache, confusion, or similar urgent symptoms, note them in red_flags, set triage to urgent, and advise seeking emergency care if appropriate.
- Never diagnose or prescribe. You are gathering information only.
- Only call complete_intake with ready: true after chief complaint, duration, severity, and a red-flag check are done. Then tell the patient the intake is complete and the clinician note is ready.
- Speak naturally. Allow interruptions. Confirm key details before ending.`;
}
