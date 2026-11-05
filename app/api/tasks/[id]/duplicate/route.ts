import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getOwner();
  const src = await prisma.task.findFirst({ where: { id, userId: user.id }, include: { subtasks: true } });
  if (!src) return NextResponse.json({ error: "Task not found" }, { status: 404 });
  const max = await prisma.task.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } });
  const task = await prisma.task.create({
    data: {
      userId: user.id, title: src.title, description: src.description, dueDate: src.dueDate,
      dueTime: src.dueTime, priority: src.priority, status: "TODO", categoryId: src.categoryId,
      estimatedDuration: src.estimatedDuration, notes: src.notes, recurrence: src.recurrence,
      sortOrder: (max._max.sortOrder ?? 0) + 1,
      subtasks: src.subtasks.length ? { create: src.subtasks.map((s) => ({ title: s.title, completed: false })) } : undefined,
    },
    include: { category: true, subtasks: true },
  });
  return NextResponse.json({ task }, { status: 201 });
}
