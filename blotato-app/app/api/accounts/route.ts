import { blotatoFetch, jsonError } from "@/lib/session";

export async function GET() {
  try {
    const data = await blotatoFetch("/users/me/accounts");
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
