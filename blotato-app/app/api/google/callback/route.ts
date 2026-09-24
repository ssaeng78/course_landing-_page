import { cookies } from "next/headers";
import { getGoogleClient, saveGoogleTokens } from "@/lib/google";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const err = url.searchParams.get("error");
  if (err) {
    return Response.redirect(`${origin}/settings?google_error=${encodeURIComponent(err)}`);
  }
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expected = store.get("google_oauth_state")?.value;
  if (!code || !state || !expected || state !== expected) {
    return Response.redirect(`${origin}/settings?google_error=invalid_state`);
  }
  const client = await getGoogleClient();
  if (!client) {
    return Response.redirect(`${origin}/settings?google=missing`);
  }
  const body = new URLSearchParams({
    code,
    client_id: client.clientId,
    client_secret: client.clientSecret,
    redirect_uri: client.redirectUri,
    grant_type: "authorization_code",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const data = (await res.json()) as {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
    error?: string;
    error_description?: string;
  };
  if (!res.ok || !data.access_token) {
    const msg = data.error_description || data.error || "token_exchange_failed";
    return Response.redirect(`${origin}/settings?google_error=${encodeURIComponent(msg)}`);
  }
  await saveGoogleTokens({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expiry: Date.now() + (data.expires_in ?? 3600) * 1000,
  });
  store.delete("google_oauth_state");
  return Response.redirect(`${origin}/?drive=connected`);
}
