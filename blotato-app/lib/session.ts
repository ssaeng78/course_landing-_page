import { cookies } from "next/headers";

export const API_KEY_COOKIE = "blotato_api_key";
export const OPENAI_COOKIE = "openai_api_key";
export const GOOGLE_TOKEN_COOKIE = "google_tokens";
export const GOOGLE_CLIENT_COOKIE = "google_oauth_client";

const BLOTATO_BASE = "https://backend.blotato.com/v2";

export class ApiError extends Error {
  status: number;
  body: unknown;

  constructor(message: string, status: number, body: unknown) {
    super(message);
    this.status = status;
    this.body = body;
  }
}

export const BlotatoError = ApiError;

export async function getApiKey(): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(API_KEY_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const fromEnv = process.env.BLOTATO_API_KEY?.trim();
  return fromEnv || null;
}

export async function getOpenAiKey(): Promise<string | null> {
  const store = await cookies();
  const fromCookie = store.get(OPENAI_COOKIE)?.value;
  if (fromCookie) return fromCookie;
  const fromEnv = process.env.OPENAI_API_KEY?.trim();
  return fromEnv || null;
}

export async function blotatoFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
  apiKeyOverride?: string | null,
): Promise<T> {
  const apiKey = (apiKeyOverride ?? (await getApiKey()))?.trim() ?? "";
  if (!apiKey) {
    throw new ApiError(
      "ยังไม่ได้ตั้งค่า Blotato API key — ไปที่หน้าตั้งค่า หรือใส่ BLOTATO_API_KEY ในไฟล์ .env.local",
      401,
      { error: "missing_api_key" },
    );
  }

  const headers = new Headers(init.headers);
  headers.set("blotato-api-key", apiKey);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${BLOTATO_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

  const text = await res.text();
  let parsed: unknown = text;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = { raw: text };
  }

  if (!res.ok) {
    const message = extractErrorMessage(parsed) || `Blotato ตอบกลับ ${res.status}`;
    throw new ApiError(message, res.status, parsed);
  }

  return parsed as T;
}

export function extractErrorMessage(body: unknown): string {
  if (!body) return "";
  if (typeof body === "string") return body;
  if (typeof body === "object") {
    const o = body as Record<string, unknown>;
    for (const key of ["errorMessage", "message", "error", "detail"]) {
      if (typeof o[key] === "string" && o[key]) return o[key] as string;
    }
    if (typeof o.error === "object" && o.error) {
      const nested = extractErrorMessage(o.error);
      if (nested) return nested;
    }
  }
  return "";
}

export function jsonError(err: unknown) {
  if (err instanceof ApiError) {
    return Response.json(
      { error: err.message, details: err.body, status: err.status },
      { status: err.status },
    );
  }
  const message = err instanceof Error ? err.message : "เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ";
  return Response.json({ error: message }, { status: 500 });
}

export function cookieBase() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
  };
}
