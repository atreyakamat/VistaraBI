
import db from '../src/lib/prisma';
import { randomUUID } from 'crypto';

async function main() {
    console.log('🧪 Starting database write test...');

    const userEmail = `test-user-${randomUUID()}@example.com`;
    const projectId = `test-project-${randomUUID()}`;

    try {
        // 1. Create a User
        console.log(`1️⃣ Creating test user (${userEmail})...`);
        const user = await db.user.create({
            data: {
                name: 'Integration Tester',
                email: userEmail,
                password: 'hashed-password-placeholder', // In real app, this would be hashed
            }
        });
        console.log('✅ User created:', user.id);

        // 2. Create a Project linked to the User
        console.log(`2️⃣ Creating test project linked to user...`);
        const project = await db.project.create({
            data: {
                id: projectId,
                name: 'Integration Test Project',
                description: 'Verifying DB write access from backend',
                userId: user.id,
            }
        });
        console.log('✅ Project created:', project.id);

        // 3. Verify Read
        console.log(`3️⃣ Verifying data persistence...`);
        const readProject = await db.project.findUnique({
            where: { id: projectId },
            include: { user: true }
        });

        if (readProject && readProject.user.email === userEmail) {
            console.log('✅ verification SUCCESS: Project and User retrieved correctly from DB.');
            console.log('   Project Name:', readProject.name);
            console.log('   Owner:', readProject.user.name);
        } else {
            console.error('❌ verification FAILED: Could not retrieve data correctly.');
        }

    } catch (error) {
        console.error('❌ Test failed:', error);
        process.exit(1);
    } finally {
        // Optional: Cleanup
        // await db.user.delete({ where: { email: userEmail } });
        await db.$disconnect();
    }
}

main();
