import { NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function GET() {
  const user = await getOwner();
  const [tasks, categories] = await Promise.all([
    prisma.task.findMany({ where: { userId: user.id }, include: { subtasks: true }, orderBy: { createdAt: "asc" } }),
    prisma.category.findMany({ where: { userId: user.id } }),
  ]);
  const body = JSON.stringify({ exportedAt: new Date().toISOString(), user: { name: user.name, email: user.email }, categories, tasks }, null, 2);
  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="taskflow-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
