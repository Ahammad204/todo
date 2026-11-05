import { NextRequest, NextResponse } from "next/server";
import { getOwner } from "@/lib/prisma";
import { computeStats } from "@/lib/stats";

export async function GET(req: NextRequest) {
  const user = await getOwner();
  const date = req.nextUrl.searchParams.get("date") || undefined;
  if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "date must be YYYY-MM-DD" }, { status: 400 });
  }
  const stats = await computeStats(user.id, date);
  return NextResponse.json({ stats });
}
