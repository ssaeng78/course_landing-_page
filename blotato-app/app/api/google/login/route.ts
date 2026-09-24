import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { cookieBase } from "@/lib/session";
import { getGoogleClient } from "@/lib/google";

export async function GET(req: Request) {
  const origin = new URL(req.url).origin;
  const client = await getGoogleClient();
  if (!client) {
    return Response.redirect(`${origin}/settings?google=missing`);
  }
  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("google_oauth_state", state, { ...cookieBase(), maxAge: 600 });
  const params = new URLSearchParams({
    client_id: client.clientId,
    redirect_uri: client.redirectUri,
    response_type: "code",
    scope: "https://www.googleapis.com/auth/drive.readonly",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return Response.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
  );
}
