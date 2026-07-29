import { GoogleGenAI } from "@google/genai";
import {
  createLiveConnectConfig,
  DEFAULT_LIVE_MODEL,
} from "@/lib/live-config";
import type { SessionOptions } from "@/lib/session-options";

export const runtime = "nodejs";

function parseOptions(body: unknown): SessionOptions {
  const raw = (body ?? {}) as Partial<SessionOptions>;
  const language =
    raw.language === "hi" || raw.language === "hinglish" ? raw.language : "en";
  const specialty =
    raw.specialty === "ent" ||
    raw.specialty === "cardio" ||
    raw.specialty === "peds"
      ? raw.specialty
      : "general";
  return { language, specialty };
}

export async function POST(request: Request) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    let options: SessionOptions = { language: "en", specialty: "general" };
    try {
      const body = await request.json();
      options = parseOptions(body);
    } catch {
      // empty body is fine
    }

    const model = DEFAULT_LIVE_MODEL;
    const voiceName = process.env.GEMINI_LIVE_VOICE ?? "Aoede";
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();
    const liveConfig = createLiveConnectConfig(voiceName, options);

    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model,
          config: liveConfig,
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return Response.json({
      token: token.name,
      model,
      voiceName,
      expiresAt: expireTime,
      options,
    });
  } catch (error) {
    console.error("Failed to create Gemini ephemeral token:", error);
    return Response.json(
      {
        error: "Failed to create Gemini ephemeral token.",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
