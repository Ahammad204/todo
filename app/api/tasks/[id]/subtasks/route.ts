import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getOwner();
  const task = await prisma.task.findFirst({ where: { id, userId: user.id } });
  if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const { title } = await req.json();
  if (!title?.trim()) return NextResponse.json({ error: "title is required" }, { status: 400 });
  const subtask = await prisma.subtask.create({ data: { taskId: id, title: String(title).trim() } });
  return NextResponse.json({ subtask }, { status: 201 });
}
