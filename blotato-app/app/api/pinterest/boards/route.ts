import { NextRequest } from "next/server";
import { blotatoFetch, jsonError } from "@/lib/session";

export async function GET(req: NextRequest) {
  try {
    const accountId = req.nextUrl.searchParams.get("accountId");
    if (!accountId) {
      return Response.json({ error: "ต้องระบุ accountId" }, { status: 400 });
    }
    const data = await blotatoFetch(
      `/social/pinterest/boards?accountId=${encodeURIComponent(accountId)}`,
    );
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
