import { GoogleGenAI } from "@google/genai";
import {
  createLiveConnectConfig,
  DEFAULT_LIVE_MODEL,
} from "@/lib/live-config";
import {
  assertJsonContentType,
  readJsonBody,
  rejectIfDisallowedOrigin,
  securityJsonHeaders,
} from "@/lib/security/http";
import { clientKey, rateLimit } from "@/lib/security/rate-limit";
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
  const originError = rejectIfDisallowedOrigin(request);
  if (originError) return originError;

  const typeError = assertJsonContentType(request);
  if (typeError) return typeError;

  const limited = rateLimit(`live-token:${clientKey(request)}`, 12, 60_000);
  if (!limited.allowed) {
    return Response.json(
      { error: "Too many session requests. Try again shortly." },
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
    const { data, error } = await readJsonBody<Partial<SessionOptions>>(request);
    if (error) return error;
    const options = parseOptions(data);

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

    return Response.json(
      {
        token: token.name,
        model,
        voiceName,
        expiresAt: expireTime,
        options,
      },
      {
        headers: securityJsonHeaders({
          "X-RateLimit-Remaining": String(limited.remaining),
        }),
      }
    );
  } catch (error) {
    console.error("Failed to create Gemini ephemeral token");
    return Response.json(
      {
        error: "Failed to create Gemini ephemeral token.",
        detail:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.message
            : undefined,
      },
      { status: 500, headers: securityJsonHeaders() }
    );
  }
}
