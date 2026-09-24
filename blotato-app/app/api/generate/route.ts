import { NextRequest } from "next/server";
import { ApiError, getOpenAiKey, jsonError } from "@/lib/session";

export async function POST(req: NextRequest) {
  try {
    const key = await getOpenAiKey();
    if (!key) {
      return Response.json(
        {
          error:
            "ยังไม่มี OpenAI API key — พิมพ์แคปชันเองได้ หรือไปหน้าตั้งค่าเพื่อวางคีย์ แล้วกดสร้างแคปชัน",
        },
        { status: 401 },
      );
    }

    const body = (await req.json()) as {
      topic?: string;
      tone?: string;
      platform?: string;
      length?: string;
      outline?: string;
      extra?: string;
    };
    const topic = (body.topic ?? "").trim();
    if (!topic && !(body.outline ?? "").trim()) {
      return Response.json(
        { error: "ใส่หัวข้อ หรือร่างงาน อย่างน้อยหนึ่งอย่าง" },
        { status: 400 },
      );
    }

    const lengthHint =
      body.length === "short"
        ? "สั้น 1-2 ประโยค"
        : body.length === "long"
          ? "ยาวขึ้น 120-180 คำ"
          : "ประมาณ 40-90 คำ";

    const prompt = [
      "คุณเป็นนักเขียนแคปชันโซเชียลภาษาไทย สำหรับเพจปฏิบัติธรรม/วิปัสสนา",
      "เขียนแคปชันโพสต์เดียว พร้อมใช้งาน ห้ามใส่คำนำหรือคำอธิบายนอกแคปชัน",
      `โทน: ${body.tone || "อบอุ่น สุภาพ น่าเชื่อถือ"}`,
      `แพลตฟอร์ม: ${body.platform || "ทั่วไป"}`,
      `ความยาว: ${lengthHint}`,
      topic ? `หัวข้อ: ${topic}` : "",
      body.outline ? `ร่างงาน/เอาท์ไลน์:\n${body.outline}` : "",
      body.extra ? `ข้อมูลเพิ่มจากไฟล์:\n${body.extra.slice(0, 4000)}` : "",
      "ลงท้ายด้วยแฮชแท็กภาษาไทยหรืออังกฤษ 2-5 อันถ้าเข้ากับเนื้อหา",
    ]
      .filter(Boolean)
      .join("\n");

    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.8,
        messages: [
          { role: "system", content: "Write only the social caption in Thai." },
          { role: "user", content: prompt },
        ],
      }),
    });
    const data = (await res.json()) as {
      error?: { message?: string };
      choices?: Array<{ message?: { content?: string } }>;
    };
    if (!res.ok) {
      throw new ApiError(
        data.error?.message || `OpenAI ตอบกลับ ${res.status}`,
        res.status,
        data,
      );
    }
    const caption = data.choices?.[0]?.message?.content?.trim() || "";
    if (!caption) {
      throw new ApiError("OpenAI ไม่ได้ส่งข้อความแคปชัน", 502, data);
    }
    return Response.json({ caption });
  } catch (err) {
    return jsonError(err);
  }
}
