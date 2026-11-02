import { jsonError } from "@/lib/session";
import { removeSchedule } from "@/lib/schedule";

export async function DELETE(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const ok = await removeSchedule(id);
    if (!ok) return Response.json({ error: "ไม่พบรายการ" }, { status: 404 });
    return Response.json({ ok: true });
  } catch (err) {
    return jsonError(err);
  }
}
