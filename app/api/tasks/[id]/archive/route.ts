import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getOwner();
  const src = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!src) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const task = await prisma.task.update({ where: { id }, data: { archivedAt: new Date() } });
  return NextResponse.json({ task });
}
