import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// One-time bootstrap for a fresh hosted database (MongoDB Atlas). Replaces
// running `prisma db seed` against the hosted DB: creates the owner user and
// the 8 default categories (same set as prisma/seed.ts) if they don't exist.
// Protected by x-report-token header (REPORT_TOKEN in .env), POST only.
const CATEGORIES = [
  { name: "Tectonic", color: "#FACC15", icon: "briefcase" },
  { name: "University", color: "#60A5FA", icon: "graduation-cap" },
  { name: "Personal", color: "#A78BFA", icon: "user" },
  { name: "Development", color: "#34D399", icon: "code" },
  { name: "Projects", color: "#F472B6", icon: "rocket" },
  { name: "Meetings", color: "#FB923C", icon: "calendar" },
  { name: "Health & Fitness", color: "#4ADE80", icon: "heart-pulse" },
  { name: "Other", color: "#94A3B8", icon: "folder" },
];

export async function POST(req: NextRequest) {
  const token = req.headers.get("x-report-token");
  if (!process.env.REPORT_TOKEN || token !== process.env.REPORT_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await prisma.user.findUnique({
    where: { email: "owner@taskflow.local" },
  });
  if (existing) {
    return NextResponse.json({ ok: true, already: true });
  }

  const user = await prisma.user.create({
    data: { email: "owner@taskflow.local", name: "Boss" },
  });
  for (const c of CATEGORIES) {
    await prisma.category.create({ data: { ...c, userId: user.id } });
  }
  return NextResponse.json({ ok: true, created: true });
}
