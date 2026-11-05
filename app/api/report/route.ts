import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/prisma";
import { buildReport } from "@/lib/stats";

// Muse nightly automation integration. Protected by x-report-token header
// (REPORT_TOKEN in .env) instead of the login cookie — see README.
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-report-token");
  if (!process.env.REPORT_TOKEN || token !== process.env.REPORT_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const user = await getOwner();
  const date = req.nextUrl.searchParams.get("date") || undefined;
  const report = await buildReport(user.id, date);
  return NextResponse.json(report);
}
