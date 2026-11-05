import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const CATEGORIES = [
  { name: "Tectonic", color: "#FACC15", icon: "briefcase" },
  { name: "University", color: "#60A5FA", icon: "graduation-cap" },
  { name: "Personal", color: "#A78BFA", icon: "user" },
  { name: "Development", color: "#34D399", icon: "code" },
  { name: "Projects", color: "#F472B6", icon: "rocket" },
  { name: "Meetings", color: "#FB923C", icon: "calendar" },
  { name: "Health & Fitness", color: "#4ADE80", icon: "heart-pulse" },
  { name: "Other", color: "#94A3B8", icon: "folder" },
];

async function main() {
  const user = await prisma.user.upsert({
    where: { email: "owner@taskflow.local" },
    update: {},
    create: { email: "owner@taskflow.local", name: "Boss" },
  });
  for (const c of CATEGORIES) {
    const exists = await prisma.category.findFirst({ where: { userId: user.id, name: c.name } });
    if (!exists) await prisma.category.create({ data: { ...c, userId: user.id } });
  }
  console.log(`Seeded owner ${user.email} with ${CATEGORIES.length} categories. No sample tasks created.`);
}

main().finally(() => prisma.$disconnect());
