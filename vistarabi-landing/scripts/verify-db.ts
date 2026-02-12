
import db from '../src/lib/prisma';

async function main() {
    console.log('Attempting to connect to database...');
    try {
        // Count projects to verify read access
        const projectCount = await db.project.count();
        console.log(`✅ Successfully connected to database!`);
        console.log(`Found ${projectCount} projects in the database.`);

        // List first 5 projects if available
        if (projectCount > 0) {
            const projects = await db.project.findMany({ take: 5, select: { id: true, name: true } });
            console.log('Sample projects:', projects);
        }

    } catch (error) {
        console.error('❌ Failed to connect to database:', error);
        process.exit(1);
    }
}

main();
