import * as XLSX from "xlsx";
import { ApiError } from "@/lib/session";
import { getGoogleClient, refreshGoogleAccess } from "@/lib/google";
import { DEFAULT_DRIVE_FOLDER_URL, driveFolderId } from "@/lib/driveFolder";
import {
  KNOWN_ROOT_FILES,
  parseScheduleSheet,
  pickScheduleWorkbook,
  type DrivePlanRow,
} from "@/lib/drivePlan";

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
};

export async function requireDriveAccess() {
  const client = await getGoogleClient();
  if (!client) {
    return {
      ok: false as const,
      status: 401,
      body: {
        error:
          "ยังไม่มี Google OAuth credentials — ใส่ GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET แล้วเชื่อมบัญชี",
        folderId: driveFolderId(),
        folderUrl: DEFAULT_DRIVE_FOLDER_URL,
        knownRootFiles: KNOWN_ROOT_FILES,
        note: "รูปอยู่ที่ root ของโฟลเดอร์นี้ ไม่ได้ซ้อนในโฟลเดอร์ย่อย",
      },
    };
  }
  const tokens = await refreshGoogleAccess();
  if (!tokens?.access_token) {
    return {
      ok: false as const,
      status: 401,
      body: {
        error: "ยังไม่ได้เชื่อม Google Drive — กดเชื่อมบัญชีเพื่อ OAuth จริง",
        folderId: driveFolderId(),
        folderUrl: DEFAULT_DRIVE_FOLDER_URL,
        knownRootFiles: KNOWN_ROOT_FILES,
      },
    };
  }
  return { ok: true as const, accessToken: tokens.access_token };
}

export async function listRootFiles(accessToken: string, folderId = driveFolderId()) {
  const queryParts = [
    `'${folderId.replace(/'/g, "\\'")}' in parents`,
    "trashed = false",
  ];
  const params = new URLSearchParams({
    q: queryParts.join(" and "),
    pageSize: "200",
    fields: "files(id,name,mimeType,thumbnailLink,size,modifiedTime)",
    supportsAllDrives: "true",
    includeItemsFromAllDrives: "true",
  });
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const data = (await res.json()) as { files?: DriveFile[]; error?: { message?: string } };
  if (!res.ok) {
    throw new ApiError(data.error?.message || `Google Drive ตอบกลับ ${res.status}`, res.status, {
      ...data,
      folderId,
      folderUrl: DEFAULT_DRIVE_FOLDER_URL,
    });
  }
  const files = (data.files || []).filter((f) => f.mimeType !== "application/vnd.google-apps.folder");
  return files;
}

export async function downloadDriveFile(accessToken: string, fileId: string) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media&supportsAllDrives=true`,
    { headers: { Authorization: `Bearer ${accessToken}` } },
  );
  if (!res.ok) {
    throw new ApiError("ดาวน์โหลดไฟล์จาก Drive ไม่สำเร็จ", res.status, await res.text());
  }
  return Buffer.from(await res.arrayBuffer());
}

export async function buildDrivePlan(accessToken: string) {
  const files = await listRootFiles(accessToken);
  const workbookName = pickScheduleWorkbook(files.map((f) => f.name));
  const workbook = workbookName ? files.find((f) => f.name === workbookName) : undefined;
  const images = files.filter((f) => /\.(jpe?g|png|gif|webp|mp4|mov)$/i.test(f.name));
  let rows: DrivePlanRow[] = [];
  let parseError: string | undefined;
  if (workbook) {
    try {
      const buf = await downloadDriveFile(accessToken, workbook.id);
      const wb = XLSX.read(buf, { type: "buffer" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const asText = json.map((row) =>
        Object.fromEntries(Object.entries(row).map(([k, v]) => [String(k), String(v ?? "")])),
      );
      rows = parseScheduleSheet(
        asText,
        images.map((i) => i.name),
      );
    } catch (err) {
      parseError = err instanceof Error ? err.message : "อ่านไฟล์ Excel ไม่สำเร็จ";
    }
  }
  return {
    folderId: driveFolderId(),
    folderUrl: DEFAULT_DRIVE_FOLDER_URL,
    workbookName: workbook?.name ?? null,
    workbookId: workbook?.id ?? null,
    images: images.map((i) => ({ id: i.id, name: i.name, mimeType: i.mimeType })),
    files,
    rows,
    parseError,
  };
}
