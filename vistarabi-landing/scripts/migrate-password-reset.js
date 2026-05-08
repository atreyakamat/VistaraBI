const { PrismaClient } = require('@prisma/client');
const db = new PrismaClient();

async function run() {
  try {
    // Create the PasswordResetToken table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "PasswordResetToken" (
        "id"        TEXT        NOT NULL,
        "userId"    TEXT        NOT NULL,
        "token"     TEXT        NOT NULL,
        "expiresAt" TIMESTAMP   NOT NULL,
        "createdAt" TIMESTAMP   NOT NULL DEFAULT NOW(),
        CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
      )
    `);
    console.log('Table created (or already exists)');

    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_userId_key" ON "PasswordResetToken"("userId")`);
    await db.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "PasswordResetToken_token_key" ON "PasswordResetToken"("token")`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "PasswordResetToken_token_idx" ON "PasswordResetToken"("token")`);
    console.log('Indexes created');

    try {
      await db.$executeRawUnsafe(`ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE`);
      console.log('Foreign key added');
    } catch (e) {
      console.log('FK constraint already exists (safe to ignore)');
    }

    console.log('✅ PasswordResetToken migration complete');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

run();
