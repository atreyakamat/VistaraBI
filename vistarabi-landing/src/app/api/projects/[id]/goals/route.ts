// src/app/api/projects/[id]/goals/route.ts
// Module 7: POST /api/projects/[id]/goals
// Triggers the Goal Strategy Engine pipeline

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeGoalPipeline } from '@/lib/module-7/goal-engine';
import { extractLocationsFromSourceData, fallbackLocationsForDomain } from '@/lib/module-7/location-extractor';
import { getCurrentUser } from '@/lib/auth';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';
import { safeParseGeneratedPlan } from '@/lib/prisma/json-schemas';
import { toPrismaJsonField } from '@/lib/prisma/json-input';
import { resolveAIModeForUser } from '@/lib/ai/request-ai-mode';
import { modeToPreferLocal, modeToRoutingMode } from '@/lib/ai/ai-mode';
import { z } from 'zod';

const createGoalRequestSchema = z.object({
    rawQuery: z.string().trim().min(1),
    preferLocal: z.boolean().optional(),
});

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const rl = checkRateLimit(getIdentifier(request, user.userId, 'goal-engine'), RATE_LIMITS.AI);
    const rlHeaders = buildRateLimitHeaders(rl);
    if (!rl.success) {
        return NextResponse.json(
            { error: 'Goal generation rate limit exceeded. Please wait before trying again.' },
            { status: 429, headers: rlHeaders }
        );
    }

    try {
        const { id: projectId } = await params;
        const body = await request.json();
        const parsedBody = createGoalRequestSchema.safeParse(body);
        if (!parsedBody.success) {
            return NextResponse.json(
                { error: 'Missing rawQuery', details: parsedBody.error.issues },
                { status: 400, headers: rlHeaders }
            );
        }
        const { rawQuery } = parsedBody.data;
        const aiMode = await resolveAIModeForUser(request, user.userId, parsedBody.data.preferLocal);
        const preferLocal = modeToPreferLocal(aiMode);
        const routingMode = modeToRoutingMode(aiMode);

        // 1. Fetch Project for Domain Context
        const project = await prisma.project.findFirst({
            where: { id: projectId, userId: user.userId },
            include: { 
                domainGovernance: true,
                sources: {
                    take: 6,
                    orderBy: { uploadedAt: 'desc' },
                    select: {
                        fileName: true,
                        columns: true,
                        data: true,
                    },
                }
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const domain = project.domainGovernance?.activeDomain || 'GENERAL';

        // 2. Derive real location candidates from uploaded source rows for Stage 7.
        const inferredLocations = extractLocationsFromSourceData(
            project.sources.map((source) => ({
                columns: source.columns,
                data: source.data,
            }))
        );
        const locations = inferredLocations.length > 0
            ? inferredLocations
            : fallbackLocationsForDomain(domain);

        // 3. Execute the 7-stage Goal Pipeline
        console.log(`[Module 7] Executing Goal Engine for Project ${projectId}: "${rawQuery}" (aiMode: ${aiMode})`);
        const canvas = await executeGoalPipeline(rawQuery, domain, locations, undefined, preferLocal, routingMode);
        const parsedGeneratedPlan = safeParseGeneratedPlan(canvas);
        if (!parsedGeneratedPlan.success) {
            return NextResponse.json(
                {
                    error: 'Goal pipeline returned an invalid strategy payload',
                    details: parsedGeneratedPlan.error.issues,
                },
                { status: 500, headers: rlHeaders }
            );
        }

        // 4. Persist the result in Database
        const goalEntry = await prisma.projectGoal.create({
            data: {
                projectId,
                rawQuery,
                targetKpiId: canvas.goal.kpiId,
                targetValue: canvas.goal.targetValue,
                timeframe: canvas.goal.timeframe,
                generatedPlan: toPrismaJsonField(parsedGeneratedPlan.data),
                status: 'ACTIVE'
            }
        });

        return NextResponse.json({
            success: true,
            goalId: goalEntry.id,
            strategyCanvas: canvas
        }, { headers: rlHeaders });

    } catch (error: unknown) {
        const details = error instanceof Error ? error.message : 'Unknown error';
        console.error('[Module 7 API] Error executing goal engine:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details
        }, { status: 500 });
    }
}

/**
 * GET /api/projects/[id]/goals
 * Returns history of goals for the project
 */
export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    try {
        const { id: projectId } = await params;
        const goals = await prisma.projectGoal.findMany({
            where: { projectId, project: { userId: user.userId } },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ goals });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
