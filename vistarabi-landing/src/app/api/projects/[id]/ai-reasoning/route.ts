import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import {
    performAIDomainReasoning,
    getAIDomainReasoning,
    getEnhancedDomainClassification,
    shouldInvokeAIReasoning,
} from '@/lib/ai/domain-reasoning';
import { checkOllamaHealth } from '@/lib/ai/ollama-client';

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

        // Get enhanced classification (combines Phase 3A + 3C)
        const enhanced = await getEnhancedDomainClassification(id);

        // Check Ollama health
        const ollamaAvailable = await checkOllamaHealth();

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

        // Check Ollama availability first
        const ollamaAvailable = await checkOllamaHealth();
        if (!ollamaAvailable) {
            return NextResponse.json({
                error: 'Ollama is not running. Please start Ollama with: ollama serve',
                ollamaAvailable: false,
            }, { status: 503 });
        }

        // Get Phase 3A confidence for context
        const detection = await db.domainDetection.findUnique({ where: { projectId: id } });
        const phase3AConfidence = detection?.confidence || 0;

        console.log('[AI-API] Triggering AI reasoning for project:', id);
        console.log('[AI-API] Phase 3A confidence:', phase3AConfidence);

        // Perform AI reasoning
        const aiReasoning = await performAIDomainReasoning(id, phase3AConfidence);

        if (!aiReasoning) {
            return NextResponse.json({
                error: 'AI reasoning failed. Check server logs.',
                ollamaAvailable: true,
            }, { status: 500 });
        }

        // Get enhanced classification
        const enhanced = await getEnhancedDomainClassification(id);

        return NextResponse.json({
            success: true,
            aiReasoning,
            enhanced,
            message: `AI reasoning complete. Suggested: ${aiReasoning.primaryDomain} at ${aiReasoning.primaryConfidence}%`,
        });
    } catch (error) {
        console.error('Trigger AI reasoning error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
