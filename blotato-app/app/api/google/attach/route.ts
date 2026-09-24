import { NextRequest } from "next/server";
import { ApiError, blotatoFetch, getApiKey, jsonError } from "@/lib/session";
import { refreshGoogleAccess } from "@/lib/google";

const DOC_TYPES: Record<string, string> = {
  "application/vnd.google-apps.document": "text/plain",
  "application/vnd.google-apps.spreadsheet": "text/csv",
};

export async function POST(req: NextRequest) {
  try {
    const tokens = await refreshGoogleAccess();
    if (!tokens?.access_token) {
      return Response.json(
        { error: "ยังไม่ได้เชื่อม Google Drive" },
        { status: 401 },
      );
    }
    const body = (await req.json()) as { fileId?: string; name?: string; mimeType?: string };
    const fileId = body.fileId?.trim();
    if (!fileId) {
      return Response.json({ error: "ต้องมี fileId" }, { status: 400 });
    }

    const metaRes = await fetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?fields=id,name,mimeType,size&supportsAllDrives=true`,
      { headers: { Authorization: `Bearer ${tokens.access_token}` } },
    );
    const meta = (await metaRes.json()) as {
      name?: string;
      mimeType?: string;
      error?: { message?: string };
    };
    if (!metaRes.ok) {
      throw new ApiError(meta.error?.message || "อ่านไฟล์ Drive ไม่ได้", metaRes.status, meta);
    }

    const mime = meta.mimeType || body.mimeType || "application/octet-stream";
    const name = meta.name || body.name || "drive-file";
    const exportAs = DOC_TYPES[mime];

    let bytes: ArrayBuffer;
    let outMime = mime;
    let filename = name;

    if (exportAs) {
      const exp = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}/export?mimeType=${encodeURIComponent(exportAs)}`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!exp.ok) {
        throw new ApiError("ส่งออกเอกสารจาก Drive ไม่สำเร็จ", exp.status, await exp.text());
      }
      bytes = await exp.arrayBuffer();
      outMime = exportAs;
      filename = name.replace(/\s+/g, "-") + (exportAs === "text/csv" ? ".csv" : ".txt");
    } else if (mime.startsWith("application/vnd.google-apps")) {
      return Response.json(
        { error: `ชนิดไฟล์นี้ยังไม่รองรับ: ${mime}` },
        { status: 400 },
      );
    } else {
      const media = await fetch(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
        { headers: { Authorization: `Bearer ${tokens.access_token}` } },
      );
      if (!media.ok) {
        throw new ApiError("ดาวน์โหลดไฟล์จาก Drive ไม่สำเร็จ", media.status, await media.text());
      }
      bytes = await media.arrayBuffer();
    }

    const isText =
      outMime.startsWith("text/") ||
      outMime === "application/json" ||
      filename.endsWith(".txt") ||
      filename.endsWith(".md");

    if (isText) {
      const text = Buffer.from(bytes).toString("utf8");
      return Response.json({
        kind: "text",
        name,
        text: text.slice(0, 8000),
      });
    }

    const apiKey = await getApiKey();
    if (!apiKey) {
      return Response.json(
        { error: "ต้องมี Blotato API key ก่อนอัปโหลดสื่อจาก Drive" },
        { status: 401 },
      );
    }
    const upload = (await blotatoFetch("/media/uploads", {
      method: "POST",
      body: JSON.stringify({ filename }),
    })) as { presignedUrl?: string; publicUrl?: string };
    if (!upload.presignedUrl || !upload.publicUrl) {
      throw new ApiError("Blotato ไม่ได้ส่ง URL อัปโหลด", 502, upload);
    }
    const put = await fetch(upload.presignedUrl, {
      method: "PUT",
      headers: { "Content-Type": outMime || "application/octet-stream" },
      body: Buffer.from(bytes),
    });
    if (!put.ok) {
      throw new ApiError(`อัปโหลดไป Blotato ไม่สำเร็จ (${put.status})`, 502, await put.text());
    }
    return Response.json({
      kind: "media",
      name,
      publicUrl: upload.publicUrl,
      contentType: outMime,
    });
  } catch (err) {
    return jsonError(err);
  }
}
