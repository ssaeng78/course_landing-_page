import { blotatoFetch, getApiKey, jsonError } from "@/lib/session";

export const runtime = "nodejs";

export async function POST(req: Request) {
  try {
    const apiKey = await getApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "ยังไม่ได้ตั้งค่า API key" },
        { status: 401 },
      );
    }

    const form = await req.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return Response.json({ error: "ไม่พบไฟล์" }, { status: 400 });
    }

    const filename = file.name || "upload.bin";
    const upload = (await blotatoFetch("/media/uploads", {
      method: "POST",
      body: JSON.stringify({ filename }),
    })) as { presignedUrl?: string; publicUrl?: string };

    if (!upload.presignedUrl || !upload.publicUrl) {
      return Response.json(
        { error: "Blotato ไม่ได้ส่ง URL สำหรับอัปโหลด", details: upload },
        { status: 502 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const put = await fetch(upload.presignedUrl, {
      method: "PUT",
      headers: {
        "Content-Type": file.type || "application/octet-stream",
      },
      body: bytes,
    });

    if (!put.ok) {
      const detail = await put.text();
      return Response.json(
        {
          error: `อัปโหลดไฟล์ไม่สำเร็จ (${put.status})`,
          details: detail.slice(0, 500),
        },
        { status: 502 },
      );
    }

    return Response.json({
      publicUrl: upload.publicUrl,
      filename,
      contentType: file.type,
      size: file.size,
    });
  } catch (err) {
    return jsonError(err);
  }
}
