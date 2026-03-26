// AI Test Endpoint - Test AI with different agent roles
// POST /api/v1/ai/test
// Test AI generation with various agent roles

import { NextRequest, NextResponse } from 'next/server';
import { generateWithFallback, type AgentRole } from '@/lib/ai/unified-ai-client';

interface TestRequest {
    prompt: string;
    agentRole?: AgentRole;
    temperature?: number;
}

export async function POST(request: NextRequest) {
    try {
        const body: TestRequest = await request.json();

        if (!body.prompt) {
            return NextResponse.json({
                error: 'Prompt is required',
            }, { status: 400 });
        }

        console.log(`[AI-Test] Testing with agent role: ${body.agentRole || 'general'}`);

        const response = await generateWithFallback({
            messages: [{ role: 'user', content: body.prompt }],
            temperature: body.temperature ?? 0.2,
            agentRole: body.agentRole || 'general',
        });

        return NextResponse.json({
            success: true,
            response: {
                content: response.content,
                provider: response.provider,
                model: response.model,
                agentRole: response.agentRole,
                latencyMs: response.latencyMs,
                tokensUsed: response.tokensUsed,
            },
            timestamp: new Date().toISOString(),
        });

    } catch (error: any) {
        console.error('[AI-Test] Test failed:', error);

        return NextResponse.json({
            success: false,
            error: error.message,
            timestamp: new Date().toISOString(),
        }, { status: 500 });
    }
}

// GET endpoint for agent role documentation
export async function GET() {
    const agentRoles: { role: AgentRole; description: string }[] = [
        { role: 'business-analyst', description: 'Business insights, KPI interpretation, strategic reasoning' },
        { role: 'data-engineer', description: 'Data quality, transformations, ETL reasoning' },
        { role: 'domain-expert', description: 'Domain classification, business context' },
        { role: 'statistician', description: 'Statistical analysis, correlations, forecasting' },
        { role: 'narrative-writer', description: 'Event narratives, explanations, summaries' },
        { role: 'strategy-planner', description: 'Goal setting, action planning, prescriptive insights' },
        { role: 'quality-auditor', description: 'Data quality assessment, validation' },
        { role: 'kpi-designer', description: 'KPI suggestions, metric formulation' },
        { role: 'general', description: 'General-purpose reasoning' },
    ];

    return NextResponse.json({
        availableAgentRoles: agentRoles,
        usage: {
            endpoint: 'POST /api/v1/ai/test',
            body: {
                prompt: 'Your test prompt',
                agentRole: 'business-analyst',
                temperature: 0.2
            }
        }
    });
}
