// src/app/api/projects/[id]/goals/route.ts
// Module 7: POST /api/projects/[id]/goals
// Triggers the Goal Strategy Engine pipeline

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { executeGoalPipeline } from '@/lib/module-7/goal-engine';

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: projectId } = params;
        const { rawQuery } = await request.json();

        if (!rawQuery) {
            return NextResponse.json({ error: 'Missing rawQuery' }, { status: 400 });
        }

        // 1. Fetch Project for Domain Context
        const project = await prisma.project.findUnique({
            where: { id: projectId },
            include: { 
                domainGovernance: true,
                sources: { select: { fileName: true } } // Basic for now
            }
        });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        const domain = project.domainGovernance?.activeDomain || 'GENERAL';
        
        // 2. Mock some locations for stage 7 (if data supports it, we'd fetch actual values)
        const locations = ['Mumbai', 'Delhi', 'Bangalore'];

        // 3. Execute the 7-stage Goal Pipeline
        console.log(`[Module 7] Executing Goal Engine for Project ${projectId}: "${rawQuery}"`);
        const canvas = await executeGoalPipeline(rawQuery, domain, locations);

        // 4. Persist the result in Database
        const goalEntry = await prisma.projectGoal.create({
            data: {
                projectId,
                rawQuery,
                targetKpiId: canvas.goal.kpiId,
                targetValue: canvas.goal.targetValue,
                timeframe: canvas.goal.timeframe,
                generatedPlan: canvas as any, // Full Strategy Canvas
                status: 'ACTIVE'
            }
        });

        return NextResponse.json({
            success: true,
            goalId: goalEntry.id,
            strategyCanvas: canvas
        });

    } catch (error: any) {
        console.error('[Module 7 API] Error executing goal engine:', error);
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: error.message 
        }, { status: 500 });
    }
}

/**
 * GET /api/projects/[id]/goals
 * Returns history of goals for the project
 */
export async function GET(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: projectId } = params;
        const goals = await prisma.projectGoal.findMany({
            where: { projectId },
            orderBy: { createdAt: 'desc' }
        });

        return NextResponse.json({ goals });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
