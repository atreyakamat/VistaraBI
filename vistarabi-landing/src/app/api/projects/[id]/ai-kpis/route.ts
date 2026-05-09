import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { getSampleDataForAI } from '@/lib/kpi';
import { getGovernedDomain } from '@/lib/domain/governance';
import { checkOllamaHealth, generateKPISuggestions } from '@/lib/ai/ollama-client';
import { checkAIHealth } from '@/lib/ai/unified-ai-client';
import { resolvePreferLocalFromRequest } from '@/lib/ai/request-ai-mode';

// POST /api/projects/[id]/ai-kpis - Get AI-derived KPIs using Ollama
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const body = await request.json().catch(() => ({} as { preferLocal?: boolean }));
        const preferLocal = resolvePreferLocalFromRequest(request, body.preferLocal);
        const project = await db.project.findUnique({ where: { id } });
        if (!project || project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Check active AI provider availability based on selected mode
        if (preferLocal) {
            const ollamaReady = await checkOllamaHealth();
            if (!ollamaReady) {
                return NextResponse.json({
                    error: 'Local AI is unavailable. Switch to Cloud mode or start Ollama.',
                    aiKpis: [],
                }, { status: 503 });
            }
        } else {
            const health = await checkAIHealth(false);
            const cloudReady = health.available.some(p => p !== 'ollama-local');
            if (!cloudReady) {
                return NextResponse.json({
                    error: 'Cloud AI is unavailable. Configure GROQ_API_KEY or switch to Local mode.',
                    aiKpis: [],
                }, { status: 503 });
            }
        }

        // Get domain
        const governance = await getGovernedDomain(id);
        const domain = governance?.activeDomain || 'ECOMMERCE';
        console.log('[AI-KPI] Domain:', domain);

        // Get sample data for context
        const { columns, rows } = await getSampleDataForAI(id);
        console.log('[AI-KPI] Got', columns.length, 'columns and', rows.length, 'rows');

        if (columns.length === 0) {
            return NextResponse.json({
                aiKpis: [],
                message: 'No data available. Please upload a file first.',
            });
        }

        // Generate KPIs using the dedicated function
        console.log('[AI-KPI] Calling Ollama for KPI suggestions...');
        const aiKpis = await generateKPISuggestions(columns, rows, domain, preferLocal);
        console.log('[AI-KPI] Received', aiKpis.length, 'KPI suggestions');

        // Format for frontend
        const formattedKpis = aiKpis
            .filter(kpi => kpi.name && kpi.formula)
            .map((kpi, idx) => {
                // Find which columns are used in the formula
                const usedColumns = columns.filter(c =>
                    kpi.formula.toLowerCase().includes(c.toLowerCase())
                );

                return {
                    kpiId: `ai-derived-${Date.now()}-${idx}`,
                    kpiName: kpi.name,
                    confidence: usedColumns.length >= 2 ? 85 : 70,
                    explanation: kpi.explanation || 'AI-generated KPI based on your data',
                    matchedColumns: usedColumns.length > 0 ? usedColumns : columns.slice(0, 2),
                    formulaExpression: kpi.formula,
                    category: kpi.category || 'derived',
                    isComputable: true,
                    isDerived: true,
                };
            });

        console.log('[AI-KPI] Returning', formattedKpis.length, 'formatted KPIs');

        return NextResponse.json({
            aiKpis: formattedKpis,
            message: formattedKpis.length > 0
                ? `Generated ${formattedKpis.length} AI-derived KPIs`
                : 'No KPIs generated. Try again or check Ollama logs.',
            debug: {
                columnsUsed: columns.length,
                rowsAnalyzed: rows.length,
                domain,
            }
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error('[AI-KPI] Error:', error);
        return NextResponse.json({
            error: 'Failed to generate AI KPIs',
            details: message,
            aiKpis: [],
        }, { status: 500 });
    }
}
