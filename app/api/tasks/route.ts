import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";
import { dhakaToday, addDays } from "@/lib/dates";

import { validateTaskBody } from "@/lib/validate";

export async function GET(req: NextRequest) {
  try {
    const user = await getOwner();
    const sp = req.nextUrl.searchParams;
    const where: any = { userId: user.id };
    if (!sp.get("includeArchived")) where.archivedAt = null;
    const search = sp.get("search");
    if (search) where.OR = [{ title: { contains: search } }, { description: { contains: search } }];
    if (sp.get("status")) where.status = sp.get("status");
    if (sp.get("priority")) where.priority = sp.get("priority");
    if (sp.get("categoryId")) where.categoryId = sp.get("categoryId");
    if (sp.get("date")) where.dueDate = sp.get("date");
    const due = sp.get("due");
    const today = dhakaToday();
    if (due === "today") where.dueDate = today;
    else if (due === "tomorrow") where.dueDate = addDays(today, 1);
    else if (due === "overdue") { where.dueDate = { lt: today, not: null }; where.status = { not: "COMPLETED" }; }
    else if (due === "inbox") where.dueDate = null;
    else if (due === "upcoming") { where.dueDate = { gt: today }; where.status = { not: "COMPLETED" }; }

    const sort = sp.get("sort") || "deadline";
    const orderBy: any =
      sort === "priority" ? [{ priority: "desc" }, { dueDate: "asc" }] :
      sort === "created" ? [{ createdAt: "desc" }] :
      sort === "order" ? [{ sortOrder: "asc" }, { createdAt: "asc" }] :
      [{ dueDate: "asc" }, { sortOrder: "asc" }, { createdAt: "asc" }];

    const tasks = await prisma.task.findMany({
      where, orderBy,
      include: { category: true, subtasks: { orderBy: { createdAt: "asc" } } },
    });
    return NextResponse.json({ tasks });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to list tasks" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getOwner();
    const b = await req.json();
    const errors = validateTaskBody(b);
    if (errors.length) return NextResponse.json({ error: errors.join("; ") }, { status: 400 });
    if (b.categoryId) {
      const cat = await prisma.category.findFirst({ where: { id: b.categoryId, userId: user.id } });
      if (!cat) return NextResponse.json({ error: "category not found" }, { status: 400 });
    }
    const max = await prisma.task.aggregate({ where: { userId: user.id }, _max: { sortOrder: true } });
    const task = await prisma.task.create({
      data: {
        userId: user.id,
        title: String(b.title).trim(),
        description: b.description || null,
        dueDate: b.dueDate || null,
        dueTime: b.dueTime || null,
        priority: b.priority || "MEDIUM",
        status: b.status || "TODO",
        categoryId: b.categoryId || null,
        estimatedDuration: b.estimatedDuration != null ? Number(b.estimatedDuration) : null,
        notes: b.notes || null,
        recurrence: b.recurrence || "NONE",
        sortOrder: (max._max.sortOrder ?? 0) + 1,
        completedAt: b.status === "COMPLETED" ? new Date() : null,
        subtasks: Array.isArray(b.subtasks) && b.subtasks.length
          ? { create: b.subtasks.filter((s: any) => s.title?.trim()).map((s: any) => ({ title: String(s.title).trim(), completed: !!s.completed })) }
          : undefined,
      },
      include: { category: true, subtasks: true },
    });
    return NextResponse.json({ task }, { status: 201 });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || "Failed to create task" }, { status: 500 });
  }
}
