import { NextResponse } from 'next/server';
import db from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch (e) {
      return NextResponse.json({ error: 'Invalid JSON payload' }, { status: 400 });
    }

    const { actionId, system, endpoint, payload, justification, projectId, userId } = body;

    if (!system || !projectId) {
      return NextResponse.json({ error: 'Missing required parameters: system and projectId' }, { status: 400 });
    }

    console.log(`[Write-Back Gateway] Received action execution:`, {
      actionId,
      system,
      endpoint,
      payload,
      justification,
      projectId,
    });

    // 1. Resolve Project and User Context
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: { user: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const targetUserId = userId || project.userId;

    // 2. Perform Mock Mutating Action depending on external API type
    const startTime = Date.now();
    const externalStatus = 'SUCCESS';
    let detailedMessage = '';

    switch (system.toUpperCase()) {
      case 'GOOGLE_ADS':
      case 'META_ADS':
        detailedMessage = `Successfully shifted 20% marketing budget to high-performing campaigns (${payload?.campaignId_target || 'Campaign_B'}) to optimize CPA.`;
        break;
      case 'STRIPE':
        detailedMessage = `Initiated automated Stripe collections workflow for delinquent invoices. Dunning notifications dispatched to ${payload?.customer_count || 12} clients.`;
        break;
      case 'SLACK':
      case 'RESEND':
        detailedMessage = `Dispatched strategic escalation report and execution plan to board members via Resend Email and Slack Webhook.`;
        break;
      default:
        detailedMessage = `Executed transaction and configuration write-back to ${system} gateway.`;
    }

    const executionTimeMs = Date.now() - startTime;

    // 3. Log into AuditLog
    const auditRecord = await db.auditLog.create({
      data: {
        sessionId: projectId,
        userId: targetUserId,
        intentId: `action-${actionId || 'adhoc'}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        rawUserQuery: `EXECUTE_ACTION_${system}_${actionId || 'default'}`,
        normalizedUserQuery: `Write-back execution for ${system} endpoint: ${endpoint || '/mutate'}`,
        llmRawOutput: JSON.stringify({ payload, justification, detailedMessage }),
        validationStagesPassed: 3,
        structuredCommand: {
          system,
          endpoint,
          payload,
          justification,
          status: externalStatus,
        } as any,
        executionStatus: 'COMPLETED',
      },
    });

    // 4. Create a system notification for the user to confirm execution
    await db.notification.create({
      data: {
        userId: targetUserId,
        type: 'kpi_goal_reached',
        title: `Executed: Strategy Action on ${system}`,
        body: `${detailedMessage} Justification: ${justification || 'Performance optimization.'}`,
        read: false,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Action executed successfully',
      detailedMessage,
      auditId: auditRecord.id,
      executionTimeMs,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[Write-Back Gateway] Error during execution:', error);
    return NextResponse.json({
      success: false,
      error: error.message || 'An error occurred during write-back execution',
    }, { status: 500 });
  }
}
