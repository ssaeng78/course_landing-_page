import { cookies } from "next/headers";
import { cookieBase, GOOGLE_CLIENT_COOKIE, GOOGLE_TOKEN_COOKIE } from "@/lib/session";

export type GoogleTokens = {
  access_token: string;
  refresh_token?: string;
  expiry: number;
};

export async function getGoogleClient(): Promise<{
  clientId: string;
  clientSecret: string;
  redirectUri: string;
} | null> {
  const store = await cookies();
  let clientId = process.env.GOOGLE_CLIENT_ID?.trim() || "";
  let clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim() || "";
  const raw = store.get(GOOGLE_CLIENT_COOKIE)?.value;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as { clientId?: string; clientSecret?: string };
      clientId = parsed.clientId?.trim() || clientId;
      clientSecret = parsed.clientSecret?.trim() || clientSecret;
    } catch {
      /* ignore */
    }
  }
  if (!clientId || !clientSecret) return null;
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI?.trim() ||
    "http://localhost:3000/api/google/callback";
  return { clientId, clientSecret, redirectUri };
}

export async function getGoogleTokens(): Promise<GoogleTokens | null> {
  const store = await cookies();
  const raw = store.get(GOOGLE_TOKEN_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleTokens;
  } catch {
    return null;
  }
}

export async function saveGoogleTokens(tokens: GoogleTokens) {
  const store = await cookies();
  store.set(GOOGLE_TOKEN_COOKIE, JSON.stringify(tokens), {
    ...cookieBase(),
    maxAge: 60 * 60 * 24 * 30,
  });
}

export async function refreshGoogleAccess(): Promise<GoogleTokens | null> {
  const client = await getGoogleClient();
  const tokens = await getGoogleTokens();
  if (!client || !tokens) return tokens;
  if (tokens.expiry > Date.now() + 30_000) return tokens;
  if (!tokens.refresh_token) return tokens;

  const body = new URLSearchParams({
    client_id: client.clientId,
    client_secret: client.clientSecret,
    refresh_token: tokens.refresh_token,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    expires_in?: number;
    error?: string;
  };
  if (!res.ok || !data.access_token) return tokens;
  const next: GoogleTokens = {
    ...tokens,
    access_token: data.access_token,
    expiry: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
  await saveGoogleTokens(next);
  return next;
}
