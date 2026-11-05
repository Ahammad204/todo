import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getOwner();
  const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  const b = await req.json();
  const data: any = {};
  if ("name" in b) data.name = String(b.name);
  if ("color" in b) data.color = String(b.color);
  if ("icon" in b) data.icon = String(b.icon);
  const category = await prisma.category.update({ where: { id }, data });
  return NextResponse.json({ category });
}

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const user = await getOwner();
  const existing = await prisma.category.findFirst({ where: { id, userId: user.id } });
  if (!existing) return NextResponse.json({ error: "Category not found" }, { status: 404 });
  // Tasks keep existing; their categoryId is set to null by the Prisma relation (onDelete: SetNull).
  await prisma.category.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
