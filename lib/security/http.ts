const MAX_JSON_BYTES = 64_000;

export function assertJsonContentType(request: Request): Response | null {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    // Allow empty body POSTs without content-type for live-token defaults.
    if (request.headers.get("content-length") === "0") return null;
    if (!request.headers.has("content-length") && !request.headers.has("transfer-encoding")) {
      return null;
    }
    if (!contentType) return null;
    return Response.json(
      { error: "Content-Type must be application/json." },
      { status: 415 }
    );
  }
  return null;
}

export async function readJsonBody<T>(
  request: Request
): Promise<{ data: T | null; error: Response | null }> {
  const raw = await request.text();
  if (!raw) return { data: null, error: null };
  if (raw.length > MAX_JSON_BYTES) {
    return {
      data: null,
      error: Response.json({ error: "Request body too large." }, { status: 413 }),
    };
  }
  try {
    return { data: JSON.parse(raw) as T, error: null };
  } catch {
    return {
      data: null,
      error: Response.json({ error: "Invalid JSON body." }, { status: 400 }),
    };
  }
}

export function isAllowedOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin navigations / curl / server-to-server

  const host = request.headers.get("host");
  try {
    const originHost = new URL(origin).host;
    if (host && originHost === host) return true;
  } catch {
    return false;
  }

  const allowed = (process.env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  if (allowed.includes(origin)) return true;

  // Default allow Vercel preview/production hostnames for this project.
  try {
    const { hostname } = new URL(origin);
    if (hostname.endsWith(".vercel.app")) return true;
    if (hostname === "localhost" || hostname === "127.0.0.1") return true;
  } catch {
    return false;
  }

  return false;
}

export function rejectIfDisallowedOrigin(request: Request): Response | null {
  if (isAllowedOrigin(request)) return null;
  return Response.json({ error: "Origin not allowed." }, { status: 403 });
}

export function securityJsonHeaders(
  extra?: HeadersInit
): Headers {
  const headers = new Headers(extra);
  headers.set("Cache-Control", "no-store");
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  return headers;
}

export function sanitizePlainText(input: unknown, max = 4000): string {
  if (typeof input !== "string") return "";
  return input.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").slice(0, max);
}
