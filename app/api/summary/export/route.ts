import { GoogleGenAI } from "@google/genai";
import { DEFAULT_TEXT_MODEL } from "@/lib/live-config";
import type { IntakeSummary } from "@/lib/intake-schema";

export const runtime = "nodejs";

type ExportRequest = {
  summary: IntakeSummary;
  transcript?: string;
};

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const body = (await request.json()) as ExportRequest;
    const client = new GoogleGenAI({ apiKey });

    const prompt = `Format this pre-consultation intake into a concise clinician handoff note. Use plain prose, no bullet lists. Keep it under 200 words. Do not diagnose.

Structured data:
${JSON.stringify(body.summary, null, 2)}

${body.transcript ? `Conversation transcript:\n${body.transcript}` : ""}`;

    const response = await client.models.generateContent({
      model: DEFAULT_TEXT_MODEL,
      contents: prompt,
    });

    const note =
      response.text?.trim() ??
      "Intake summary could not be generated. See structured fields below.";

    return Response.json({ note });
  } catch (error) {
    console.error("Failed to export summary:", error);
    return Response.json(
      {
        error: "Failed to generate clinician note.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
