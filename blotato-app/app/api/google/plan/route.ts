import { jsonError } from "@/lib/session";
import { buildDrivePlan, requireDriveAccess } from "@/lib/driveAccess";

export async function GET() {
  try {
    const access = await requireDriveAccess();
    if (!access.ok) {
      return Response.json(access.body, { status: access.status });
    }
    const plan = await buildDrivePlan(access.accessToken);
    return Response.json(plan);
  } catch (err) {
    return jsonError(err);
  }
}
