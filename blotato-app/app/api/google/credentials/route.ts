import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { cookieBase, GOOGLE_CLIENT_COOKIE, jsonError } from "@/lib/session";
import { getGoogleClient } from "@/lib/google";

export async function GET() {
  const client = await getGoogleClient();
  return Response.json({ configured: Boolean(client) });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      clientId?: string;
      clientSecret?: string;
    };
    const clientId = body.clientId?.trim() ?? "";
    const clientSecret = body.clientSecret?.trim() ?? "";
    if (!clientId || !clientSecret) {
      return Response.json(
        { error: "ต้องมีทั้ง Google client id และ client secret" },
        { status: 400 },
      );
    }
    const store = await cookies();
    store.set(
      GOOGLE_CLIENT_COOKIE,
      JSON.stringify({ clientId, clientSecret }),
      { ...cookieBase(), maxAge: 60 * 60 * 24 * 30 },
    );
    return Response.json({ configured: true });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  const store = await cookies();
  store.delete(GOOGLE_CLIENT_COOKIE);
  return Response.json({ configured: false });
}
