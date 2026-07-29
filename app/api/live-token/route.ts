import { GoogleGenAI } from "@google/genai";
import {
  createLiveConnectConfig,
  DEFAULT_LIVE_MODEL,
} from "@/lib/live-config";

export const runtime = "nodejs";

export async function POST() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "GEMINI_API_KEY is not configured on the server." },
      { status: 500 }
    );
  }

  try {
    const model = DEFAULT_LIVE_MODEL;
    const voiceName = process.env.GEMINI_LIVE_VOICE ?? "Aoede";
    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 60 * 1000).toISOString();

    const client = new GoogleGenAI({ apiKey });
    const token = await client.authTokens.create({
      config: {
        uses: 1,
        expireTime,
        newSessionExpireTime,
        liveConnectConstraints: {
          model,
          config: createLiveConnectConfig(voiceName),
        },
        httpOptions: { apiVersion: "v1alpha" },
      },
    });

    return Response.json({
      token: token.name,
      model,
      voiceName,
      expiresAt: expireTime,
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
