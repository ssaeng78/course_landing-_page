import { NextRequest } from "next/server";
import { blotatoFetch, jsonError } from "@/lib/session";

type Destination = {
  accountId: string;
  platform: string;
  target?: Record<string, unknown>;
};

type AdditionalPost = { text: string; mediaUrls?: string[] };

type PublishBody = {
  text?: string;
  mediaUrls?: string[];
  additionalPosts?: AdditionalPost[];
  destinations?: Destination[];
  scheduledTime?: string | null;
  useNextFreeSlot?: boolean;
};

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as PublishBody;
    const text = (body.text ?? "").trim();
    const mediaUrls = (body.mediaUrls ?? []).map((u) => u.trim()).filter(Boolean);
    const destinations = body.destinations ?? [];

    if (!text && mediaUrls.length === 0) {
      return Response.json(
        { error: "กรุณาใส่ข้อความหรือสื่ออย่างน้อยหนึ่งอย่าง" },
        { status: 400 },
      );
    }
    if (destinations.length === 0) {
      return Response.json(
        { error: "เลือกอย่างน้อยหนึ่งบัญชีปลายทาง" },
        { status: 400 },
      );
    }

    const results: Array<Record<string, unknown>> = [];

    for (const dest of destinations) {
      if (!dest.accountId || !dest.platform) {
        results.push({
          accountId: dest.accountId,
          platform: dest.platform,
          ok: false,
          error: "บัญชีปลายทางไม่ครบ (accountId / platform)",
        });
        continue;
      }

      const target = {
        targetType: dest.platform,
        ...(dest.target ?? {}),
      };
      target.targetType = dest.platform;

      const content: Record<string, unknown> = {
        text: text || " ",
        mediaUrls,
        platform: dest.platform,
      };
      if (body.additionalPosts && body.additionalPosts.length > 0) {
        if (["twitter", "bluesky", "threads"].includes(dest.platform)) {
          content.additionalPosts = body.additionalPosts.map((p) => ({
            text: p.text ?? "",
            mediaUrls: p.mediaUrls ?? [],
          }));
        }
      }

      const payload: Record<string, unknown> = {
        post: {
          accountId: dest.accountId,
          content,
          target,
        },
      };
      if (body.scheduledTime) {
        payload.scheduledTime = body.scheduledTime;
      } else if (body.useNextFreeSlot) {
        payload.useNextFreeSlot = true;
      }

      try {
        const created = (await blotatoFetch("/posts", {
          method: "POST",
          body: JSON.stringify(payload),
        })) as Record<string, unknown>;
        results.push({
          accountId: dest.accountId,
          platform: dest.platform,
          ok: true,
          postSubmissionId: created.postSubmissionId ?? created.id,
          response: created,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : "ส่งไม่สำเร็จ";
        results.push({
          accountId: dest.accountId,
          platform: dest.platform,
          ok: false,
          error: message,
        });
      }
    }

    const allFailed = results.every((r) => !r.ok);
    return Response.json(
      { results },
      { status: allFailed ? 502 : 200 },
    );
  } catch (err) {
    return jsonError(err);
  }
}
