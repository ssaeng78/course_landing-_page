import { blotatoFetch, jsonError } from "@/lib/session";
import { listSchedule, updateSchedule } from "@/lib/schedule";

export async function POST(
  _req: Request,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const items = await listSchedule();
    const item = items.find((i) => i.id === id);
    if (!item) return Response.json({ error: "ไม่พบรายการ" }, { status: 404 });
    if (!item.caption.trim()) {
      return Response.json({ error: "ไม่มีแคปชัน — ห้ามตั้งโพสต์" }, { status: 400 });
    }

    const blotatoIds: string[] = [];
    let lastError = "";
    for (const dest of item.destinations) {
      const payload = {
        post: {
          accountId: dest.accountId,
          content: {
            text: item.caption,
            mediaUrls: item.mediaUrls,
            platform: dest.platform,
          },
          target: { targetType: dest.platform, ...(dest.target ?? {}) },
        },
        scheduledTime: item.scheduledTime,
      };
      try {
        const created = (await blotatoFetch("/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        })) as { postSubmissionId?: string };
        if (created.postSubmissionId) blotatoIds.push(created.postSubmissionId);
      } catch (err) {
        lastError = err instanceof Error ? err.message : "ส่งไม่สำเร็จ";
      }
    }

    const next = await updateSchedule(id, {
      status: blotatoIds.length ? "submitted" : "failed",
      blotatoIds,
      lastError: lastError || undefined,
    });
    return Response.json({ item: next });
  } catch (err) {
    return jsonError(err);
  }
}
