import { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { cookieBase, getOpenAiKey, jsonError, OPENAI_COOKIE } from "@/lib/session";

export async function GET() {
  const key = await getOpenAiKey();
  return Response.json({
    connected: Boolean(key),
    source: process.env.OPENAI_API_KEY?.trim() ? "env" : key ? "cookie" : null,
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { apiKey?: string };
    const apiKey = body.apiKey?.trim() ?? "";
    if (!apiKey) {
      return Response.json({ error: "กรุณาวาง OpenAI API key" }, { status: 400 });
    }
    if (!apiKey.startsWith("sk-")) {
      return Response.json(
        { error: "รูปแบบคีย์ไม่เหมือน OpenAI key (ควรขึ้นต้นด้วย sk-)" },
        { status: 400 },
      );
    }
    const store = await cookies();
    store.set(OPENAI_COOKIE, apiKey, { ...cookieBase(), maxAge: 60 * 60 * 24 * 30 });
    return Response.json({ connected: true, source: "cookie" });
  } catch (err) {
    return jsonError(err);
  }
}

export async function DELETE() {
  const store = await cookies();
  store.delete(OPENAI_COOKIE);
  return Response.json({ connected: false });
}
