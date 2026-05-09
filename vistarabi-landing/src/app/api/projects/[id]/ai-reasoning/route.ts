import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import {
    triggerDomainReasoning,
    getAIDomainReasoning,
    getEnhancedClassification,
} from '@/lib/ai/domain-reasoning';
import { checkOllamaHealth } from '@/lib/ai/ollama-client';
import { checkAIHealth } from '@/lib/ai/unified-ai-client';
import { resolvePreferLocalFromRequest } from '@/lib/ai/request-ai-mode';

// GET /api/projects/[id]/ai-reasoning - Get AI domain reasoning
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // Get existing AI reasoning
        const aiReasoning = await getAIDomainReasoning(id);

        // Get enhanced classification (combines rule-based + AI)
        const enhanced = await getEnhancedClassification(id);

        const preferLocal = resolvePreferLocalFromRequest(request);
        const ollamaAvailable = preferLocal
            ? await checkOllamaHealth()
            : (await checkAIHealth(false)).available.length > 0;

        return NextResponse.json({
            aiReasoning,
            enhanced,
            ollamaAvailable,
        });
    } catch (error) {
        console.error('Get AI reasoning error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

// POST /api/projects/[id]/ai-reasoning - Trigger AI domain reasoning
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        const body = await request.json().catch(() => ({} as { preferLocal?: boolean }));
        const preferLocal = resolvePreferLocalFromRequest(request, body.preferLocal);

        console.log('[AI-API] Triggering semantic reasoning for project:', id);

        // Perform semantic reasoning
        const aiReasoning = await triggerDomainReasoning(id, preferLocal);

        if (!aiReasoning) {
            // Check if rule-based confidence is already high
            const detection = await db.domainDetection.findUnique({ where: { projectId: id } });
            if (detection && detection.confidence >= 60) {
                return NextResponse.json({
                    success: true,
                    message: 'Rule-based detection is already confident. AI not needed.',
                    aiReasoning: null,
                    enhanced: await getEnhancedClassification(id),
                });
            }

            return NextResponse.json({
                error: 'AI reasoning failed or no data to analyze.',
                ollamaAvailable: preferLocal,
            }, { status: 500 });
        }

        // Get enhanced classification
        const enhanced = await getEnhancedClassification(id);

        return NextResponse.json({
            success: true,
            aiReasoning,
            enhanced,
            message: `AI analysis complete. Recommended: ${aiReasoning.aiRecommendedDomain} at ${aiReasoning.aiSemanticConfidence}%`,
        });
    } catch (error) {
        console.error('Trigger AI reasoning error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
