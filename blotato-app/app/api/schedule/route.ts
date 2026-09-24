import { NextRequest } from "next/server";
import { jsonError } from "@/lib/session";
import { addSchedule, listSchedule, type ScheduleItem } from "@/lib/schedule";

export async function GET() {
  try {
    const items = await listSchedule();
    return Response.json({ items });
  } catch (err) {
    return jsonError(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<ScheduleItem> & { caption?: string };
    const caption = (body.caption ?? "").trim();
    if (!caption) {
      return Response.json(
        { error: "ต้องมีแคปชันที่ตรวจแล้ว ก่อนตั้งโพสต์ในตารางงาน" },
        { status: 400 },
      );
    }
    if (!body.scheduledTime) {
      return Response.json({ error: "ต้องระบุวันเวลาในตารางงาน" }, { status: 400 });
    }
    if (!body.destinations?.length) {
      return Response.json({ error: "เลือกอย่างน้อยหนึ่งบัญชีปลายทาง" }, { status: 400 });
    }
    const item: ScheduleItem = {
      id: crypto.randomUUID(),
      caption,
      mediaUrls: body.mediaUrls ?? [],
      scheduledTime: body.scheduledTime,
      destinations: body.destinations,
      status: "planned",
      topic: body.topic,
      notes: body.notes,
      createdAt: new Date().toISOString(),
    };
    await addSchedule(item);
    return Response.json({ item }, { status: 201 });
  } catch (err) {
    return jsonError(err);
  }
}
