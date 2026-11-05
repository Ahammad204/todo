import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function GET() {
  const user = await getOwner();
  const categories = await prisma.category.findMany({
    where: { userId: user.id }, orderBy: { createdAt: "asc" },
    include: { _count: { select: { tasks: true } } },
  });
  return NextResponse.json({ categories });
}

export async function POST(req: NextRequest) {
  const user = await getOwner();
  const b = await req.json();
  if (!b.name?.trim()) return NextResponse.json({ error: "name is required" }, { status: 400 });
  const category = await prisma.category.create({
    data: { userId: user.id, name: String(b.name).trim(), color: b.color || "#FACC15", icon: b.icon || "folder" },
  });
  return NextResponse.json({ category }, { status: 201 });
}
