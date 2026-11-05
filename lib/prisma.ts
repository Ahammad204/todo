import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({ log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"] });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;

export async function getOwner() {
  let user = await prisma.user.findFirst({ orderBy: { createdAt: "asc" } });
  if (!user) {
    user = await prisma.user.create({ data: { email: "owner@taskflow.local", name: "Boss" } });
  }
  return user;
}
