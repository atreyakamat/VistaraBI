const { PrismaClient } = require('@prisma/client');
const p = new PrismaClient();
async function main() {
  const projects = await p.project.findMany({ where: { user: { email: 'demo@vistara.com' } }, select: { id: true, name: true } });
  for (const proj of projects) {
    const blueprint = await p.kPIBlueprint.findUnique({ where: { projectId: proj.id }, select: { id: true } });
    if (blueprint) {
      const kpis = await p.approvedKPI.findMany({ where: { blueprintId: blueprint.id }, select: { id: true, name: true, category: true } });
      console.log(`${proj.name}: ${kpis.length} KPIs`);
      if (kpis.length > 0) console.log(`  Samples: ${kpis.slice(0, 3).map(k => k.name).join(', ')}`);
      
      const aggCount = await p.aggregationRule.count({ where: { kpi: { blueprintId: blueprint.id } } });
      console.log(`  Total aggregation rules: ${aggCount}`);
    } else {
      console.log(`${proj.name}: No blueprint`);
    }
  }
  await p.$disconnect();
}
main();
