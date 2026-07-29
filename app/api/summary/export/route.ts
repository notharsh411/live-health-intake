import { GoogleGenAI } from "@google/genai";
import { DEFAULT_TEXT_MODEL } from "@/lib/live-config";
import type { IntakeSummary } from "@/lib/intake-schema";
import {
  assertJsonContentType,
  readJsonBody,
  rejectIfDisallowedOrigin,
  sanitizePlainText,
  securityJsonHeaders,
} from "@/lib/security/http";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";

export const runtime = "nodejs";

type ExportRequest = {
  summary?: IntakeSummary;
  transcript?: string;
};

function sanitizeSummary(input: IntakeSummary | undefined): IntakeSummary {
  if (!input || typeof input !== "object") return {};
  const arrayField = (value: unknown) =>
    Array.isArray(value)
      ? value
          .filter((item): item is string => typeof item === "string")
          .map((item) => sanitizePlainText(item, 200))
          .slice(0, 20)
      : undefined;

  const triage = input.triage_level;
  return {
    chief_complaint: sanitizePlainText(input.chief_complaint, 500) || undefined,
    onset: sanitizePlainText(input.onset, 200) || undefined,
    duration: sanitizePlainText(input.duration, 200) || undefined,
    severity_0_10:
      typeof input.severity_0_10 === "number" &&
      Number.isFinite(input.severity_0_10)
        ? Math.min(10, Math.max(0, input.severity_0_10))
        : undefined,
    associated_symptoms: arrayField(input.associated_symptoms),
    current_medications: arrayField(input.current_medications),
    allergies: arrayField(input.allergies),
    red_flags: arrayField(input.red_flags),
    missing_information: arrayField(input.missing_information),
    clinician_notes: sanitizePlainText(input.clinician_notes, 1000) || undefined,
    visual_findings: sanitizePlainText(input.visual_findings, 1000) || undefined,
    triage_level:
      triage === "routine" || triage === "soon" || triage === "urgent"
        ? triage
        : undefined,
  };
}

export async function POST(request: Request) {
  const originError = rejectIfDisallowedOrigin(request);
  if (originError) return originError;

  const typeError = assertJsonContentType(request);
  if (typeError) return typeError;

  const limited = rateLimit(`summary-export:${clientKey(request)}`, 20, 60_000);
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many export requests. Try again shortly." },
      {
        status: 429,
        headers: securityJsonHeaders({
          "Retry-After": String(limited.retryAfterSec),
        }),
      }
    );
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500, headers: securityJsonHeaders() }
    );
  }

  try {
    const { data, error } = await readJsonBody<ExportRequest>(request);
    if (error) return error;

    const summary = sanitizeSummary(data?.summary);
    const transcript = sanitizePlainText(data?.transcript, 12_000);
    const client = new GoogleGenAI({ apiKey });

    const prompt = `Format this pre-consultation intake into a concise clinician handoff note. Use plain prose, no bullet lists. Keep it under 200 words. Do not diagnose.

Structured data:
${JSON.stringify(summary)}

${transcript ? `Conversation transcript:\n${transcript}` : ""}`;

    const response = await client.models.generateContent({
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
    });

    const note =
      sanitizePlainText(response.text?.trim(), 4000) ||
      "Intake summary could not be generated. See structured fields below.";

    return Response.json(
      { note },
      {
        headers: securityJsonHeaders({
          "X-RateLimit-Remaining": String(limited.remaining),
        }),
      }
    );
  } catch {
    console.error("Failed to export summary");
    return Response.json(
      { error: "Failed to generate clinician note." },
      { status: 500, headers: securityJsonHeaders() }
    );
  }
}
