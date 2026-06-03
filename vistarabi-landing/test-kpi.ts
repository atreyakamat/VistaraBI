import { executeKPI } from './src/lib/execution/kpi-executor.ts';

// We can't easily run it outside Next.js if it depends on aliases and Prisma.
// Let's create a script that just runs using `npx tsx` and imports the kpi executor
import db from './src/lib/prisma.ts';

async function test() {
    const p = await db.project.findFirst();
    if (!p) {
        console.log("No projects found");
        return;
    }
    console.log("Project:", p.id);
    const kpi = await db.approvedKPI.findFirst({ where: { blueprint: { projectId: p.id } } });
    if (!kpi) {
        console.log("No KPIs found");
        return;
    }
    console.log("KPI:", kpi.id, kpi.name);
    try {
        const res = await executeKPI(p.id, kpi.id, {});
        console.log("Success:", res.primaryValue);
    } catch(e) {
        console.error("Execute failed:", e);
    }
}
test();
