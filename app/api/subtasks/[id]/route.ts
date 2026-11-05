import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const b = await req.json();
  const data: any = {};
  if ("title" in b) data.title = String(b.title);
  if ("completed" in b) data.completed = !!b.completed;
  const subtask = await prisma.subtask.update({ where: { id }, data }).catch(() => null);
  if (!subtask) return NextResponse.json({ error: "Subtask not found" }, { status: 404 });
  return NextResponse.json({ subtask });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  await prisma.subtask.delete({ where: { id } }).catch(() => null);
  return NextResponse.json({ ok: true });
}
