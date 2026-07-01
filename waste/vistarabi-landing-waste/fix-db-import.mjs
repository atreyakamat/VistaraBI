import fs from 'fs';
import path from 'path';

const filesToFix = [
  "src/app/api/projects/[id]/dashboard-intelligence/route.ts",
  "src/app/api/projects/[id]/dashboard-state/drill-down/route.ts",
  "src/app/api/projects/[id]/dashboard-state/route.ts",
  "src/app/api/projects/[id]/dashboard/data/route.ts",
  "src/app/api/projects/[id]/dashboard/explanations/route.ts",
  "src/app/api/projects/[id]/dashboard/insights/route.ts",
  "src/app/api/projects/[id]/dashboard/invalidate/route.ts",
  "src/app/api/projects/[id]/dashboard/kpi/[kpiId]/route.ts",
  "src/app/api/projects/[id]/dashboard/route.ts",
  "src/app/api/projects/[id]/module6/ask/route.ts",
  "src/app/api/projects/[id]/visualization/filter/route.ts",
  "src/app/api/projects/[id]/visualization/kpi/[kpiId]/route.ts",
  "src/app/api/projects/[id]/visualization/route.ts"
];

for (const relPath of filesToFix) {
    const fullPath = path.join(process.cwd(), relPath.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) continue;

    let content = fs.readFileSync(fullPath, 'utf8');
    
    if (!content.includes("import db from '@/lib/prisma';")) {
        content = content.replace(/(import .*?;)/, "$1\nimport db from '@/lib/prisma';");
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Added db import to: ${relPath}`);
    }
}
