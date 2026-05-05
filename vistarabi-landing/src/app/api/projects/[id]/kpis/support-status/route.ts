import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { getDomainKPINames } from '@/lib/kpi/domain-metadata';
import { loadBlueprintWithKPIs } from '@/lib/kpi/blueprint-loader';

// GET /api/projects/[id]/kpi-support-status
// Returns a matrix of supported, partially supported, and unsupported KPIs for the detected domain.
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        // 1. Detect Domain
        const detection = await db.domainDetection.findUnique({ where: { projectId: id } });
        const domain = detection?.detectedDomain || 'GENERAL';

        // 2. Load available KPIs for Domain
        const domainKPIs = getDomainKPINames(domain as any);

        // 3. Load Blueprint to see what's actually selected/supported by current schema
        const blueprint = await loadBlueprintWithKPIs(id);
        const supportedKpiIds = new Set(blueprint?.kpis.map(k => k.id) || []);

        const status = domainKPIs.map(kpiName => ({
            name: kpiName,
            status: supportedKpiIds.has(kpiName) ? 'SUPPORTED' : 'NOT_SUPPORTED',
            reason: supportedKpiIds.has(kpiName) ? 'Matched in current blueprint' : 'Missing schema mappings'
        }));

        return NextResponse.json({
            domain,
            status
        });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
