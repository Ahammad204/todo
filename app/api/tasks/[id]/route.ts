import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";
import { advanceRecurrence } from "@/lib/dates";
import { validateTaskBody } from "@/lib/validate";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await getOwner();
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id }, include: { subtasks: true } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    const b = await req.json();
    const errors = validateTaskBody(b, true);
    if (errors.length) return NextResponse.json({ error: errors.join("; ") }, { status: 400 });

    const data: any = {};
    for (const f of ["title", "description", "dueDate", "dueTime", "priority", "status", "categoryId", "notes", "recurrence"] as const) {
      if (f in b) data[f] = b[f] === "" ? null : b[f];
    }
    if ("estimatedDuration" in b) data.estimatedDuration = b.estimatedDuration != null && b.estimatedDuration !== "" ? Number(b.estimatedDuration) : null;
    if ("sortOrder" in b) data.sortOrder = Number(b.sortOrder);
    if ("archivedAt" in b) data.archivedAt = b.archivedAt ? new Date(b.archivedAt) : null;

    const wasCompleted = existing.status === "COMPLETED";
    const nowCompleted = (b.status ?? existing.status) === "COMPLETED";
    if (nowCompleted && !wasCompleted) data.completedAt = new Date();
    if (!nowCompleted && wasCompleted) data.completedAt = null;

    const task = await prisma.task.update({ where: { id }, data, include: { category: true, subtasks: { orderBy: { createdAt: "asc" } } } });

    // Recurrence: spawn next occurrence once, on the transition into COMPLETED.
    let nextOccurrence = null;
    if (nowCompleted && !wasCompleted && existing.recurrence !== "NONE") {
      const baseDate = existing.dueDate || new Date().toISOString().slice(0, 10);
      nextOccurrence = await prisma.task.create({
        data: {
          userId: user.id,
          title: existing.title, description: existing.description,
          dueDate: advanceRecurrence(baseDate, existing.recurrence),
          dueTime: existing.dueTime, priority: existing.priority, status: "TODO",
          categoryId: existing.categoryId, estimatedDuration: existing.estimatedDuration,
          notes: existing.notes, recurrence: existing.recurrence, sortOrder: existing.sortOrder,
          subtasks: existing.subtasks.length
            ? { create: existing.subtasks.map((s) => ({ title: s.title, completed: false })) }
            : undefined,
        },
      });
    }
    return NextResponse.json({ task, nextOccurrence });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to update task" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const user = await getOwner();
    const existing = await prisma.task.findFirst({ where: { id, userId: user.id } });
    if (!existing) return NextResponse.json({ error: "Task not found" }, { status: 404 });
    await prisma.task.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to delete task" }, { status: 500 });
  }
}
