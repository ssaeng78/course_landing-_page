import { NextRequest } from "next/server";
import { jsonError, ApiError } from "@/lib/session";
import { getGoogleClient, refreshGoogleAccess } from "@/lib/google";
import { driveFolderId, DEFAULT_DRIVE_FOLDER_URL } from "@/lib/driveFolder";

export async function GET(req: NextRequest) {
  try {
    const client = await getGoogleClient();
    if (!client) {
      return Response.json(
        {
          error:
            "ยังไม่มี Google OAuth credentials — ใส่ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET ใน .env.local หรือหน้าตั้งค่า แล้วกดเชื่อมบัญชี",
          folderId: driveFolderId(),
          folderUrl: DEFAULT_DRIVE_FOLDER_URL,
        },
        { status: 401 },
      );
    }
    const tokens = await refreshGoogleAccess();
    if (!tokens?.access_token) {
      return Response.json(
        {
          error: "ยังไม่ได้เชื่อม Google Drive — กดปุ่มเชื่อมบัญชีเพื่อ OAuth จริง",
          folderId: driveFolderId(),
          folderUrl: DEFAULT_DRIVE_FOLDER_URL,
        },
        { status: 401 },
      );
    }

    const q = req.nextUrl.searchParams.get("q")?.trim();
    const folderId = req.nextUrl.searchParams.get("folderId")?.trim() || driveFolderId();
    const queryParts = [`'${folderId.replace(/'/g, "\\'")}' in parents`, "trashed = false"];
    if (q) queryParts.push(`name contains '${q.replace(/'/g, "\\'")}'`);

    const params = new URLSearchParams({
      q: queryParts.join(" and "),
      pageSize: "50",
      fields: "files(id,name,mimeType,thumbnailLink,iconLink,size,modifiedTime)",
      supportsAllDrives: "true",
      includeItemsFromAllDrives: "true",
    });
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    });
    const data = (await res.json()) as {
      files?: unknown[];
      error?: { message?: string };
    };
    if (!res.ok) {
      throw new ApiError(
        data.error?.message || `Google Drive ตอบกลับ ${res.status}`,
        res.status,
        {
          ...data,
          folderId,
          folderUrl: DEFAULT_DRIVE_FOLDER_URL,
        },
      );
    }
    return Response.json({
      folderId,
      folderUrl: DEFAULT_DRIVE_FOLDER_URL,
      files: data.files || [],
    });
  } catch (err) {
    return jsonError(err);
  }
}
