const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixDashboardConfigs() {
    console.log('Fixing DashboardConfigs for demo@vistarabi.com...');
    const user = await prisma.user.findUnique({ where: { email: 'demo@vistarabi.com' } });
    if (!user) return console.log('No user');

    const projects = await prisma.project.findMany({
        where: { userId: user.id },
        include: { dashboardConfig: true }
    });

    for (const p of projects) {
        if (!p.dashboardConfig) continue;

        const blueprint = await prisma.kPIBlueprint.findFirst({ where: { projectId: p.id } });
        if (!blueprint) continue;

        const kpis = await prisma.approvedKPI.findMany({ where: { blueprintId: blueprint.id } });
        if (kpis.length === 0) continue;

        // Map the current ApprovedKPIs to DashboardCards
        const newCards = kpis.map((kpi, i) => ({
            kpiId: kpi.kpiLibraryId || kpi.id,
            formula: 'SUM(amount)',
            kpiName: kpi.name,
            cardSize: 'md',
            category: kpi.category || 'Metric',
            position: i,
            confidence: 100,
            colorAccent: '#3b82f6',
            chartSelection: {
                reason: 'Auto-fixed',
                chartType: 'bar',
                confidence: 0.8,
                chartLibrary: 'chartjs'
            }
        }));

        const newSections = [
            {
                id: 'section-1',
                title: 'Overview',
                cards: newCards
            }
        ];

        await prisma.dashboardConfig.update({
            where: { id: p.dashboardConfig.id },
            data: { sections: newSections }
        });

        console.log(`Fixed ${p.name} with ${newCards.length} KPIs`);
    }

    console.log('Done!');
}

fixDashboardConfigs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
