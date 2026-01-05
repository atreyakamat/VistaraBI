import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { getSampleDataForAI } from '@/lib/kpi';
import { getGovernedDomain } from '@/lib/domain/governance';
import { generateCompletion, checkOllamaHealth } from '@/lib/ai/ollama-client';

// POST /api/projects/[id]/ai-kpis - Get AI-derived KPIs
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });

        // Check Ollama availability
        const ollamaReady = await checkOllamaHealth();
        if (!ollamaReady) {
            return NextResponse.json({
                error: 'Ollama is not available. Please ensure ollama serve is running.',
                aiKpis: [],
            }, { status: 503 });
        }

        // Get domain
        const governance = await getGovernedDomain(id);
        const domain = governance?.activeDomain || 'ECOMMERCE';

        // Get sample data for context
        const { columns, rows } = await getSampleDataForAI(id);

        if (columns.length === 0) {
            return NextResponse.json({
                aiKpis: [],
                message: 'No data available for AI analysis',
            });
        }

        // Build prompt for Ollama
        const prompt = `You are a business intelligence expert. Analyze this data and suggest 5 derived KPIs.

DOMAIN: ${domain}

AVAILABLE COLUMNS:
${columns.join(', ')}

SAMPLE DATA (first 10 rows):
${JSON.stringify(rows.slice(0, 5), null, 2)}

Based on this data, suggest 5 derived KPIs that can be calculated by COMBINING these columns.
For each KPI, provide:
1. name: A clear KPI name
2. formula: How to calculate it using column names
3. category: revenue, customer, conversion, growth, etc.
4. explanation: Why this KPI is valuable

Respond ONLY with valid JSON array:
[{"name": "...", "formula": "...", "category": "...", "explanation": "..."}]`;

        console.log('[AI-KPI] Querying Ollama for derived KPIs...');
        const response = await generateCompletion({ messages: [{ role: 'user', content: prompt }] });

        // Parse AI response
        let aiKpis: { name: string; formula: string; category: string; explanation: string }[] = [];
        try {
            // Extract JSON from response
            const jsonMatch = response.match(/\[[\s\S]*?\]/);
            if (jsonMatch) {
                aiKpis = JSON.parse(jsonMatch[0]);
            }
        } catch (parseErr) {
            console.error('[AI-KPI] Failed to parse Ollama response:', parseErr);
            // Return empty if parsing fails
        }

        // Format for frontend
        const formattedKpis = aiKpis.map((kpi, idx) => ({
            kpiId: `ai-derived-${idx}`,
            kpiName: kpi.name,
            confidence: 75,
            explanation: kpi.explanation,
            matchedColumns: columns.filter(c => kpi.formula.toLowerCase().includes(c.toLowerCase())),
            formulaExpression: kpi.formula,
            category: kpi.category || 'derived',
            isComputable: true,
            isDerived: true,
        }));

        return NextResponse.json({
            aiKpis: formattedKpis,
            message: `Generated ${formattedKpis.length} AI-derived KPIs`,
        });
    } catch (error) {
        console.error('AI KPI error:', error);
        return NextResponse.json({ error: 'Failed to generate AI KPIs' }, { status: 500 });
    }
}
