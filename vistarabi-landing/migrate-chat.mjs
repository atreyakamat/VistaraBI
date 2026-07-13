import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();
async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "ProjectChatMessage" (
        "id" TEXT NOT NULL,
        "projectId" TEXT NOT NULL,
        "role" TEXT NOT NULL,
        "content" JSONB NOT NULL,
        "module" TEXT NOT NULL DEFAULT 'module-6',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ProjectChatMessage_pkey" PRIMARY KEY ("id")
    );
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProjectChatMessage_projectId_module_idx" ON "ProjectChatMessage"("projectId", "module");
  `);
  await prisma.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "ProjectChatMessage_createdAt_idx" ON "ProjectChatMessage"("createdAt");
  `);
  // Try adding foreign key if it does not exist
  try {
      await prisma.$executeRawUnsafe(`
        ALTER TABLE "ProjectChatMessage" ADD CONSTRAINT "ProjectChatMessage_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;
      `);
  } catch (e) {
      console.log("FK already exists or error:", e.message);
  }
  console.log("Migration complete.");
}
main().catch(console.error).finally(() => prisma.$disconnect());
