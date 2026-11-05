import { NextRequest, NextResponse } from "next/server";
import { prisma, getOwner } from "@/lib/prisma";

export async function GET() {
  const user = await getOwner();
  return NextResponse.json({ user: { id: user.id, name: user.name, email: user.email, createdAt: user.createdAt } });
}

export async function PATCH(req: NextRequest) {
  const user = await getOwner();
  const b = await req.json();
  const data: any = {};
  if (b.name?.trim()) data.name = String(b.name).trim();
  if (b.email?.trim()) {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(b.email)) return NextResponse.json({ error: "invalid email" }, { status: 400 });
    data.email = String(b.email).trim();
  }
  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({ user: { id: updated.id, name: updated.name, email: updated.email } });
}
