import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function run() {
    const userEmail = 'demo@vistarabi.com';
    const user = await prisma.user.findUnique({ where: { email: userEmail } });

    if (!user) {
        console.error("❌ User not found!");
        process.exit(1);
    }

    const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: { sources: true }
    });

    for (const project of projects) {
        if (project.sources.length === 1) {
            console.log(`Adding extra datasets to project: ${project.name}`);
            const baseSource = project.sources[0];

            for (let i = 1; i <= 2; i++) {
                await prisma.source.create({
                    data: {
                        projectId: project.id,
                        fileName: `Historical_Archive_v${i}.csv`,
                        fileType: 'CSV',
                        status: 'READY',
                        columns: baseSource.columns,
                        data: baseSource.data,
                        rowCount: baseSource.rowCount,
                        colCount: baseSource.colCount,
                        uploadedAt: new Date(Date.now() - i * 86400000), // i days ago
                    }
                });
            }
        }
    }
    console.log("Done adding datasets!");
}

run()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
