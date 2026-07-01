import { PrismaClient } from '@prisma/client';
import { generateDashboardConfig } from './src/lib/dashboard/index.ts';

const prisma = new PrismaClient();

async function test() {
    const projectId = 'fb22b21b-0ea1-428d-8d03-2cbd9c989af6';
    try {
        console.log(`Testing dashboard generation directly for ${projectId}...`);
        const config = await generateDashboardConfig(projectId);
        console.log("SUCCESS!", config.metadata);
    } catch (e) {
        console.error("FAILED:");
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

test();