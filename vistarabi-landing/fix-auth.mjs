import fs from 'fs';
import path from 'path';

const filesToFix = [
  "src/app/api/projects/[id]/dashboard/data/route.ts",
  "src/app/api/projects/[id]/dashboard/explanations/route.ts",
  "src/app/api/projects/[id]/dashboard/insights/route.ts",
  "src/app/api/projects/[id]/dashboard/invalidate/route.ts",
  "src/app/api/projects/[id]/dashboard/kpi/[kpiId]/route.ts",
  "src/app/api/projects/[id]/dashboard/route.ts",
  "src/app/api/projects/[id]/dashboard-intelligence/route.ts",
  "src/app/api/projects/[id]/dashboard-state/drill-down/route.ts",
  "src/app/api/projects/[id]/dashboard-state/route.ts",
  "src/app/api/projects/[id]/kpi-eligibility/route.ts",
  "src/app/api/projects/[id]/module6/ask/route.ts",
  "src/app/api/projects/[id]/visualization/filter/route.ts",
  "src/app/api/projects/[id]/visualization/kpi/[kpiId]/route.ts",
  "src/app/api/projects/[id]/visualization/route.ts",
  "src/app/api/projects/[id]/ai-kpis/route.ts"
];

for (const relPath of filesToFix) {
    const fullPath = path.join(process.cwd(), relPath.replace(/\//g, path.sep));
    if (!fs.existsSync(fullPath)) {
        console.log(`Skipping missing file: ${relPath}`);
        continue;
    }

    let content = fs.readFileSync(fullPath, 'utf8');
    let modified = false;

    // Add import if missing
    if (!content.includes("import { getCurrentUser }")) {
        content = content.replace(/(import .*?;)/, "$1\nimport { getCurrentUser } from '@/lib/auth';");
        modified = true;
    }

    // Replace the params destructuring with the auth block
    // It usually looks like: const { id: projectId } = await params;
    // or const { id } = await params;
    // or const { id, kpiId } = await params;

    const paramRegex = /const\s+\{\s*([^}]+)\s*\}\s*=\s*await\s+params;/g;
    
    content = content.replace(paramRegex, (match, paramStr) => {
        // If it already has some auth right after, skip
        // But since we know it doesn't from our check, we can inject.
        
        let idVar = 'id';
        if (paramStr.includes('id: projectId')) {
            idVar = 'projectId';
        } else if (paramStr.includes('id: projId')) {
            idVar = 'projId';
        }

        return `${match}
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }
        const _authProject = await db.project.findUnique({ where: { id: ${idVar} } });
        if (!_authProject || _authProject.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }`;
    });

    if (content !== fs.readFileSync(fullPath, 'utf8')) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Fixed auth in: ${relPath}`);
    }
}
