import { blotatoFetch, jsonError } from "@/lib/session";

export async function GET(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const data = await blotatoFetch(
      `/users/me/accounts/${encodeURIComponent(id)}/subaccounts`,
    );
    return Response.json(data);
  } catch (err) {
    return jsonError(err);
  }
}
