import { blotatoFetch, jsonError } from "@/lib/session";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const qs = url.searchParams.toString();
    const data = await blotatoFetch(`/posts${qs ? `?${qs}` : ""}`);
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
