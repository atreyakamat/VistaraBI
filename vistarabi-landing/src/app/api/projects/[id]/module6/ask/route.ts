// Module 6A — API Route: POST /api/projects/:id/module6/ask
// Accepts NL query from frontend "Ask AI" button.
// Calls handleAskAI() and returns Module6Response.
// Raw LLM output is never returned to the frontend.

import { NextRequest, NextResponse } from 'next/server';
import { handleAskAI } from '@/lib/module-6';

// ─── Request Body ────────────────────────────────────────────────────────────

interface AskAIRequestBody {
    message: string;
    sessionId: string;
}

// ─── Route Handler ────────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
    const { id: projectId } = await params;

    // Parse body
    let body: AskAIRequestBody;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json(
            {
                status: 'rejected',
                message: 'Invalid request body — must be JSON with { message, sessionId }',
                intent_id: 'unknown',
                error: { code: 'INVALID_REQUEST', message: 'Failed to parse request body', recoverable: false },
            },
            { status: 400 }
        );
    }

    const { message, sessionId } = body;

    if (!message || typeof message !== 'string' || message.trim().length === 0) {
        return NextResponse.json(
            {
                status: 'rejected',
                message: 'message field is required and must be a non-empty string',
                intent_id: 'unknown',
                error: { code: 'INVALID_REQUEST', message: 'Empty message', recoverable: true },
            },
            { status: 400 }
        );
    }

    if (!sessionId || typeof sessionId !== 'string') {
        return NextResponse.json(
            {
                status: 'rejected',
                message: 'sessionId is required',
                intent_id: 'unknown',
                error: { code: 'INVALID_REQUEST', message: 'Missing sessionId', recoverable: false },
            },
            { status: 400 }
        );
    }

    // Enforce max query length
    if (message.length > 2000) {
        return NextResponse.json(
            {
                status: 'rejected',
                message: 'Query too long — max 2000 characters',
                intent_id: 'unknown',
                error: { code: 'INVALID_REQUEST', message: 'Query exceeds 2000 char limit', recoverable: true },
            },
            { status: 400 }
        );
    }

    // Extract userId from auth header if present (optional)
    const authHeader = request.headers.get('authorization');
    const userId = authHeader ? authHeader.replace('Bearer ', '') : undefined;

    // Run the full Module 6A pipeline
    const result = await handleAskAI(projectId, sessionId, message, userId);

    // Map status to HTTP status code
    const httpStatus =
        result.status === 'success' ? 200
            : result.status === 'already_processed' ? 200
                : result.status === 'rejected' ? 422    // Unprocessable — structured rejection
                    : result.status === 'execution_failed' ? 500
                        : 500;

    return NextResponse.json(result, { status: httpStatus });
}

// Only POST is supported
export async function GET(): Promise<NextResponse> {
    return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
