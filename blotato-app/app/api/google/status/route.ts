import { cookies } from "next/headers";
import { GOOGLE_TOKEN_COOKIE } from "@/lib/session";
import { getGoogleClient, getGoogleTokens } from "@/lib/google";
import { DEFAULT_DRIVE_FOLDER_URL, driveFolderId } from "@/lib/driveFolder";
import { KNOWN_ROOT_FILES } from "@/lib/drivePlan";

export async function GET() {
  const client = await getGoogleClient();
  const tokens = await getGoogleTokens();
  return Response.json({
    configured: Boolean(client),
    connected: Boolean(tokens?.access_token),
    folderId: driveFolderId(),
    folderUrl: DEFAULT_DRIVE_FOLDER_URL,
    knownRootFiles: KNOWN_ROOT_FILES,
  });
}

export async function DELETE() {
  const store = await cookies();
  store.delete(GOOGLE_TOKEN_COOKIE);
  return Response.json({ connected: false });
}
