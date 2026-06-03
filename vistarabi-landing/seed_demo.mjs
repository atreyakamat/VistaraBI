import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
    const password = 'VistaraDemo@2026';
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const user = await prisma.user.upsert({
        where: { email: 'demo@vistarabi.com' },
        update: {
            password: hashedPassword,
            emailVerified: new Date(),
        },
        create: {
            email: 'demo@vistarabi.com',
            name: 'Demo User',
            password: hashedPassword,
            emailVerified: new Date(),
        },
    });
    
    console.log('✅ User demo@vistarabi.com seeded');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
