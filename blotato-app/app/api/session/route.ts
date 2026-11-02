import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { API_KEY_COOKIE, blotatoFetch, cookieBase, jsonError } from "@/lib/session";

function publicUser(me: Record<string, unknown>) {
  const { apiKey: _drop, ...rest } = me;
  void _drop;
  return rest;
}

export async function GET() {
  try {
    const me = await blotatoFetch<Record<string, unknown>>("/users/me");
    return Response.json({ connected: true, source: "session", user: publicUser(me) });
  } catch (err) {
    const store = await cookies();
    const hasCookie = Boolean(store.get(API_KEY_COOKIE)?.value);
    const hasEnv = Boolean(process.env.BLOTATO_API_KEY?.trim());
    if (!hasCookie && !hasEnv) {
      return Response.json({ connected: false, source: null });
    }
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { apiKey?: string };
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey) {
      return Response.json({ error: "กรุณาวาง API key" }, { status: 400 });
    }
    const me = await blotatoFetch<Record<string, unknown>>("/users/me", {}, apiKey);
    const store = await cookies();
    store.set(API_KEY_COOKIE, apiKey, { ...cookieBase(), maxAge: 60 * 60 * 24 * 30 });
    return Response.json({ connected: true, user: publicUser(me) });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  const store = await cookies();
  store.delete(API_KEY_COOKIE);
  return Response.json({ connected: false });
}
