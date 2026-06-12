const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
    const u = await prisma.user.findUnique({ where: { email: 'demo@vistarabi.com' } });
    const ps = await prisma.project.findMany({
        where: { userId: u.id },
        include: { dashboardConfig: true }
    });
    for (const p of ps) {
        let kpis = [];
        try {
            const blueprint = await prisma.kPIBlueprint.findFirst({ where: { projectId: p.id } });
            if (blueprint) {
                kpis = await prisma.approvedKPI.findMany({ where: { blueprintId: blueprint.id } });
            }
        } catch(e){}
        console.log(p.name, 'Config:', !!p.dashboardConfig, 'KPIs:', kpis.length);
    }
}
main().then(()=>prisma.$disconnect());
