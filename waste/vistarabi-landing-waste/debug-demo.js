const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findUnique({ where: { email: 'demo@vistarabi.com' } });
    const ps = await prisma.project.findMany({
        where: { userId: u.id },
        include: { dashboardConfig: true, kpiBlueprints: { include: { kpis: true } } }
    });
    for (const p of ps) {
        console.log(p.name, 'Config:', !!p.dashboardConfig, 'KPIs:', p.kpiBlueprints?.[0]?.kpis?.length);
    }
}
main().then(()=>prisma.$disconnect());
