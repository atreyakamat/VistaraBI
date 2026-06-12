const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findUnique({ where: { email: 'demo@vistarabi.com' } });
    const ps = await prisma.project.findMany({
        where: { userId: u.id, name: 'saas Special Strategy Workspace' },
        include: { dashboardConfig: true }
    });
    for (const p of ps) {
        console.log(p.name, p.dashboardConfig?.sections?.[0]?.cards);
    }
}
main().then(()=>prisma.$disconnect());
