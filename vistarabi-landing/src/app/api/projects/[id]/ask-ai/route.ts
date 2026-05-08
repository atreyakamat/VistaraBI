// Module 6 — Unified Ask AI API Route
// POST /api/projects/[id]/ask-ai
//
// Single intelligence gateway routing to:
//   Module 6A: handleAskAI (dashboard commands)
//   Module 6B: handleEventQuery (KPI event narration)
//   Module 6C: handleCorrelationQuery (KPI correlation)
//   Module 6E: handleSynthesisQuery (multi-evidence synthesis)
//
// All routing is deterministic and server-side.
// No model metadata is forwarded to the frontend.
// State Injection Pipeline: accepts optional strategyContext from M7/M8
// and enriches the Ollama system prompt with live strategy data.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import db from '@/lib/prisma';
import { sanitizeUserQuery } from '@/lib/module-6/infrastructure/prompt-builder';
import { getSessionMemory, updateSessionMemory, resolvePronouns, injectContext, getFollowUpSuggestions } from '@/lib/module-6/orchestration/orchestrator';
import type { StrategyCanvasResult } from '@/lib/module-8/types';
import { checkRateLimit, getIdentifier, buildRateLimitHeaders, RATE_LIMITS } from '@/lib/security/rate-limiter';

// ─── Utility: Levenshtein Distance & Fuzzy Match ──────────────────────────────

function getLevenshteinDistance(a: string, b: string): number {
    if (!a.length) return b.length;
    if (!b.length) return a.length;
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,
                matrix[i][j - 1] + 1,
                matrix[i - 1][j - 1] + cost
            );
        }
    }
    return matrix[a.length][b.length];
}

function computeSimilarity(a: string, b: string): number {
    const dist = getLevenshteinDistance(a.toLowerCase(), b.toLowerCase());
    const maxLen = Math.max(a.length, b.length);
    if (maxLen === 0) return 1.0;
    return 1 - (dist / maxLen);
}

function fuzzyMatchKPI(query: string, kpiName: string): number {
    const qTokens = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
    const kTokens = kpiName.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);

    if (query.toLowerCase().includes(kpiName.toLowerCase().replace(/_/g, ' '))) {
        return 1.0;
    }

    if (!qTokens.length || !kTokens.length) return 0;

    let score = 0;
    for (const kt of kTokens) {
        let bestTokenScore = 0;
        for (const qt of qTokens) {
            const sim = computeSimilarity(qt, kt);
            if (sim > bestTokenScore) bestTokenScore = sim;
        }
        score += bestTokenScore;
    }
    return score / kTokens.length;
}

// ─── Intent Classification ────────────────────────────────────────────────────

type QueryRoute = '6A' | '6B' | '6C' | '6E' | '7A' | 'UNSUPPORTED';

const COMMAND_PATTERNS = [
    /\b(show|add|create|remove|delete|update|build|make|put|new|generate)\b.*\b(card|chart|kpi|metric)\b/i,
    /\b(display|plot|graph|draw)\b.*\b(by|over|per)\b/i,
    /\b(give me|i want|can i have)\b.*\b(card|chart|kpi|metric)\b/i,
];

const CORRELATION_PATTERNS = [
    /\b(correlat|relat|connection|link|association|between)\b/i,
    /\b(how does)\b.*\b(affect|impact|change)\b/i,
    /\b(impact of)\b.*\b(on)\b/i,
];

const COMPARISON_PATTERNS = [
    /\b(compar[a-z]*|vs\.?|versus|against)\b/i,
];

const EVENT_PATTERNS = [
    /\b(why|explain|what happened|spike|drop|loss|profit|anomaly|anomalous|anomalies|change)\b/i,
    /\b(went up|went down|increased|decreased|surge|fell|jumped|tanked)\b/i,
    /\b(tell me|how is|performance of|what's going on with|status of|how much|what is|what are|value of|current)\b/i,
];

const SYNTHESIS_PATTERNS = [
    /\b(overview|summary|synthesis|synthesize|overall|pattern|signal|insight)\b/i,
    /\b(risk|volatile|exposure)\b/i,
    /\b(how are we doing|general update|big picture|tl;?dr|what should i know)\b/i,
];

const TREND_PATTERNS = [
    /\b(trend|trending|over time|history|historically|past year|past month|month over month|year over year|yoy|mom)\b/i,
    /\b(growth|trajectory|direction)\b/i
];

const GOAL_PATTERNS = [
    /\b(increase|reduce|decrease|grow|boost|improve|maximize|minimize|optimize)\b.*\b(by|to|in|for|before|over)\b/i,
    /\b(set a goal|target)\b/i
];

// New deterministic scalar query patterns
const SCALAR_PATTERNS = [
    /\b(what is|what are|what was|what's|whats|whais|wha is|how much|give me|show me|value of|total|current|number of|count of)\b/i,
    /\b(last month|this quarter|this month|this year|fy|q1|q2|q3|q4)\b/i,
    /\b(january|february|march|april|may|june|july|august|september|october|november|december)\b/i,
    /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b/i
];

function classifyRoute(message: string): QueryRoute | 'KPI_VALUE_QUERY' | 'TREND_ANALYSIS' | 'COMPARISON_ANALYSIS' | 'CONTEXTUAL_EXPLANATION' | 'UNSUPPORTED' | 'UNSUPPORTED_SCOPE' {
    if (COMMAND_PATTERNS.some(p => p.test(message))) return '6A';
    if (GOAL_PATTERNS.some(p => p.test(message))) return '7A';
    if (TREND_PATTERNS.some(p => p.test(message))) return 'TREND_ANALYSIS';
    if (COMPARISON_PATTERNS.some(p => p.test(message))) return 'COMPARISON_ANALYSIS';

    const isWhyQuery = /\b(why|explain|reason|what happened to|how come|whats going on with|anomaly|anomalous|anomalies)\b/i.test(message);

    // Check exclusion for scalar querying
    const hasComplexIntent =
        isWhyQuery ||
        /\b(compar|correlate|versus|vs|against|overview|summary|synthesize|risk|risk|pattern|trend|trending)\b/i.test(message) ||
        SYNTHESIS_PATTERNS.some(p => p.test(message)) ||
        CORRELATION_PATTERNS.some(p => p.test(message));

    if (!hasComplexIntent && SCALAR_PATTERNS.some(p => p.test(message))) {
        return 'KPI_VALUE_QUERY';
    }

    if (isWhyQuery) return 'CONTEXTUAL_EXPLANATION';
    if (EVENT_PATTERNS.some(p => p.test(message))) return '6B';
    if (CORRELATION_PATTERNS.some(p => p.test(message))) return '6C';
    if (SYNTHESIS_PATTERNS.some(p => p.test(message))) return '6E';

    return 'UNSUPPORTED';
}

// ─── KPI ID Extraction ────────────────────────────────────────────────

/**
 * Attempt to extract two KPI IDs from the user message by matching
 * known KPI names in the project. Uses exact and fuzzy matching.
 * Falls back to first two KPIs found if no name match.
 */
async function extractKpiPair(message: string, projectId: string): Promise<{ kpiAId: string; kpiBId: string } | null> {
    try {
        const state = await db.dashboardState.findFirst({
            where: { projectId },
            orderBy: { createdAt: 'desc' },
            select: { cards: true },
        });

        if (!state?.cards) return null;
        const cards = state.cards as unknown as Array<{ kpiId: string; kpiName: string }>;
        const kpiIds = cards.map(c => c.kpiId).filter(Boolean);
        if (kpiIds.length < 2) return null;

        const msgLower = message.toLowerCase();
        const matches: Array<{ id: string; score: number }> = [];

        for (const card of cards) {
            if (!card.kpiId || !card.kpiName) continue;

            let score = 0;
            const kpiNorm = card.kpiName.toLowerCase().replace(/_/g, ' ');
            if (msgLower.includes(kpiNorm)) {
                score = 1.0;
            } else {
                score = fuzzyMatchKPI(message, card.kpiName);
            }

            if (score > 0.70) {
                matches.push({ id: card.kpiId, score });
            }
        }

        // Sort by highest score descending
        matches.sort((a, b) => b.score - a.score);

        if (matches.length >= 2) {
            return { kpiAId: matches[0].id, kpiBId: matches[1].id };
        }

        // Fall back to first two KPIs
        return { kpiAId: kpiIds[0], kpiBId: kpiIds[1] };
    } catch {
        return null;
    }
}

/**
 * Find a specific KPI ID by matching its name in the query.
 * Returns { kpi, candidates } to support clarification handling.
 */
async function extractSingleKpi(message: string, projectId: string) {
    const kpis = await db.approvedKPI.findMany({
        where: { blueprint: { projectId } }
    });

    const msgLower = message.toLowerCase();

    // Pass 1: Exact substring match
    for (const kpi of kpis) {
        const kpiNorm = kpi.name.toLowerCase().replace(/_/g, ' ');
        if (msgLower.includes(kpiNorm)) {
            return { kpi, candidates: [] };
        }
    }

    // Pass 2: Fuzzy match and collect candidates > 0.65 for clarification
    const candidates: Array<{ kpi: typeof kpis[0]; score: number }> = [];
    for (const kpi of kpis) {
        const score = fuzzyMatchKPI(message, kpi.name);
        if (score > 0.65) {
            candidates.push({ kpi, score });
        }
    }

    candidates.sort((a, b) => b.score - a.score);

    if (candidates.length === 1 || (candidates.length > 1 && candidates[0].score > candidates[1].score + 0.15)) {
        return { kpi: candidates[0].kpi, candidates: [] };
    }

    // Ambiguity: Top matches are close
    if (candidates.length > 1) {
        return {
            kpi: null,
            candidates: candidates.slice(0, 3).map(c => c.kpi)
        };
    }

    return { kpi: null, candidates: [] };
}

// ─── Main Handler ─────────────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        // Auth
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });

        // Rate limit: 20 AI requests per minute per user
        const rl = checkRateLimit(getIdentifier(request, user.userId, 'ask-ai'), RATE_LIMITS.AI);
        const rlHeaders = buildRateLimitHeaders(rl);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'AI rate limit exceeded. Please wait before sending more queries.', route: 'RATE_LIMITED' },
                { status: 429, headers: rlHeaders }
            );
        }

        const { id: projectId } = await params;

        const project = await db.project.findUnique({ where: { id: projectId } });
        if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

        // Parse body
        const body = await request.json() as {
            sessionId?: string;
            message?: string;
            strategyContext?: StrategyCanvasResult; // M6→M8 State Injection
        };

        if (!body.message || typeof body.message !== 'string') {
            return NextResponse.json({ error: 'message is required' }, { status: 400 });
        }
        const raw = body.message.trim();
        if (raw.length > 500) {
            return NextResponse.json({ status: 'rejected', message: 'Message exceeds 500 character limit.', route: 'VALIDATION' });
        }

        const sanitized = sanitizeUserQuery(raw);
        const sessionId = body.sessionId || projectId;

        // ─── Module 6F: Conversational Orchestrator ──────────────────────────────
        const mem = getSessionMemory(sessionId);
        let activeQuery = sanitized;

        // 1. Resolve pronouns (it/that -> last KPI name)
        activeQuery = resolvePronouns(activeQuery, mem);

        // 2. Intent Classification based on resolved query
        const route = classifyRoute(activeQuery);

        // 3. Fallback context injection if classification missed due to missing noun
        if (route === 'UNSUPPORTED' || route === 'UNSUPPORTED_SCOPE') {
            const reTested = injectContext(activeQuery, mem);
            const reRouted = classifyRoute(reTested);
            if (reRouted !== 'UNSUPPORTED' && reRouted !== 'UNSUPPORTED_SCOPE') {
                activeQuery = reTested;
                // We'll proceed with reRouted, but TypeScript needs us to map it cleanly below
            }
        }

        // Final route
        const finalRoute = classifyRoute(activeQuery);

        let result: Record<string, unknown>;

        try {
            switch (finalRoute) {
                case 'KPI_VALUE_QUERY': {
                    const { kpi, candidates } = await extractSingleKpi(sanitized, projectId);

                    if (!kpi && candidates.length > 0) {
                        return NextResponse.json({
                            status: 'clarification_required',
                            route: 'KPI_VALUE_QUERY',
                            message: "I found multiple metrics that might match. Which specifically would you like to see?",
                            options: candidates.map(c => ({ id: c.id, name: c.name }))
                        });
                    }

                    if (!kpi) {
                        return NextResponse.json({
                            status: 'rejected',
                            route: 'KPI_VALUE_QUERY',
                            message: "The requested metric is not available in this dataset."
                        });
                    }

                    // Strict scalar execution against Module 5.5
                    const { executeKPI } = await import('@/lib/execution/kpi-executor');
                    const execResult = await executeKPI(projectId, kpi.id, {});

                    const value = execResult.primaryValue ?? execResult.dataset?.[0]?.value ?? 0;

                    result = {
                        status: 'success',
                        route: 'KPI_VALUE_QUERY',
                        kpiName: kpi.name,
                        value: value.toString(),
                        unit: (kpi as { unit?: string }).unit || '',
                        period: 'Total', // Default scalar aggregation
                        delta: execResult.delta,
                        deltaPercent: execResult.deltaPercent,
                        deltaDirection: execResult.deltaDirection,
                        confidence: 'deterministic',
                    };

                    updateSessionMemory(sessionId, {
                        lastKpiId: kpi.id,
                        lastKpiName: kpi.name,
                        lastIntent: 'metric_retrieval'
                    });

                    break;
                }
                case '6A': {
                    const { handleAskAI } = await import('@/lib/module-6');
                    result = (await handleAskAI(projectId, sessionId, sanitized, user.userId)) as unknown as Record<string, unknown>;
                    break;
                }
                case '6B': {
                    const { handleEventQuery } = await import('@/lib/module-6/events');
                    result = (await handleEventQuery(projectId, activeQuery)) as unknown as Record<string, unknown>;

                    if (result.status === 'success') {
                        updateSessionMemory(sessionId, {
                            lastIntent: 'contextual_explanation'
                        });
                    }
                    break;
                }
                case 'CONTEXTUAL_EXPLANATION': {
                    // This is Task 5: Orchestrated "Why"
                    const { handleEventQuery } = await import('@/lib/module-6/events');
                    const eventRes = await handleEventQuery(projectId, activeQuery);

                    if (eventRes.status !== 'success' || !eventRes.evidence) {
                        result = eventRes as unknown as Record<string, unknown>;
                    } else {
                        // Found primary event. Now scan for correlations involving this KPI to add depth.
                        const { handleSynthesisQuery } = await import('@/lib/module-6/synthesis');
                        const targetKpiId = eventRes.evidence.kpi_id;

                        // We'll mock/pull relevant correlations if possible, or just synthesize the event.
                        // Realistically, 6E expects arrays of packets.
                        result = (await handleSynthesisQuery(
                            projectId,
                            [eventRes.evidence],
                            [], // In V1, we only pass the event packet for rich narration.
                            activeQuery
                        )) as unknown as Record<string, unknown>;

                        // Special: If synthesis is successful, it becomes the narrative.
                        updateSessionMemory(sessionId, {
                            lastKpiId: targetKpiId,
                            lastIntent: 'contextual_explanation'
                        });
                    }
                    break;
                }
                case '6C': {
                    const { handleCorrelationQuery } = await import('@/lib/module-6/correlations');
                    // We might need memory injection again for extraction specifically
                    const extractedQuery = injectContext(activeQuery, mem);
                    const pair = await extractKpiPair(extractedQuery, projectId);

                    if (!pair) {
                        result = { status: 'rejected', message: 'Could not identify two KPIs to correlate. Please name the KPIs in your message.' };
                    } else {
                        result = (await handleCorrelationQuery(projectId, pair.kpiAId, pair.kpiBId, 'monthly', [0], extractedQuery)) as unknown as Record<string, unknown>;
                        if (result.status === 'success') {
                            updateSessionMemory(sessionId, { lastIntent: 'correlation_analysis' });
                        }
                    }
                    break;
                }
                case '6E': {
                    const { handleSynthesisQuery } = await import('@/lib/module-6/synthesis');
                    const { getLatestEvidencePackets } = await import('@/lib/module-6/synthesis/packet-loader');
                    const { events, correlations } = await getLatestEvidencePackets(projectId);
                    result = (await handleSynthesisQuery(projectId, events, correlations, sanitized)) as unknown as Record<string, unknown>;
                    break;
                }
                case '7A': {
                    // For Module 7 Goal strategies, we can return a directive for the client to open the Goal panel
                    // or trigger the Module 7 API directly. For now, we will return a directive.
                    result = {
                        status: 'success',
                        route: '7A',
                        directive: 'OPEN_GOAL_ENGINE',
                        message: "I've routed this to the Goal Strategy Engine.",
                        confidence: 'deterministic'
                    };
                    updateSessionMemory(sessionId, { lastIntent: 'goal_generation' });
                    break;
                }
                case 'TREND_ANALYSIS': {
                    const { kpi, candidates } = await extractSingleKpi(sanitized, projectId);

                    if (!kpi && candidates.length > 0) {
                        return NextResponse.json({
                            status: 'clarification_required',
                            route: 'TREND_ANALYSIS',
                            message: "Which metric would you like to see the trend for?",
                            options: candidates.map(c => ({ id: c.id, name: c.name }))
                        });
                    }

                    if (!kpi) {
                        return NextResponse.json({
                            status: 'rejected',
                            route: 'TREND_ANALYSIS',
                            message: "Could not identify the metric for trend analysis."
                        });
                    }

                    const { executeKPI } = await import('@/lib/execution/kpi-executor');
                    // Execute with a standard length for trend analysis, Module 5.5 will auto-calculate volatility
                    const execResult = await executeKPI(projectId, kpi.id, {});

                    const vIndex = execResult.profiling?.volatilityIndex || 0;
                    let vLabel = 'low volatility';
                    if (vIndex > 0.4) vLabel = 'high volatility';
                    else if (vIndex > 0.2) vLabel = 'moderate volatility';

                    result = {
                        status: 'success',
                        route: 'TREND_ANALYSIS',
                        kpiName: kpi.name,
                        dataset: execResult.dataset?.slice(-12) || [], // Return last 12 points for mini-chart
                        trendDirection: execResult.deltaDirection || 'flat',
                        deltaPercent: execResult.deltaPercent || 0,
                        volatilityIndex: vIndex,
                        summarySentence: `${kpi.name} trended ${execResult.deltaDirection || 'flat'} over the period, shifting by ${Math.abs(execResult.deltaPercent || 0).toFixed(1)}% with ${vLabel}.`,
                        confidence: 'deterministic'
                    };

                    updateSessionMemory(sessionId, {
                        lastKpiId: kpi.id,
                        lastKpiName: kpi.name,
                        lastIntent: 'trend_analysis'
                    });

                    break;
                }
                case 'COMPARISON_ANALYSIS': {
                    const extractedQuery = injectContext(activeQuery, mem);
                    const pair = await extractKpiPair(extractedQuery, projectId);
                    if (!pair) {
                        return NextResponse.json({
                            status: 'rejected',
                            route: 'COMPARISON_ANALYSIS',
                            message: "Could not identify two metrics to compare. Please specify both metrics."
                        });
                    }

                    const { executeKPI } = await import('@/lib/execution/kpi-executor');
                    const [resA, resB] = await Promise.all([
                        executeKPI(projectId, pair.kpiAId, {}),
                        executeKPI(projectId, pair.kpiBId, {})
                    ]);

                    const valA = resA.primaryValue ?? resA.dataset?.[0]?.value ?? 0;
                    const valB = resB.primaryValue ?? resB.dataset?.[0]?.value ?? 0;

                    let ratio = 0;
                    if (valB !== 0) ratio = valA / valB;

                    const [kpiA, kpiB] = await Promise.all([
                        db.approvedKPI.findUnique({ where: { id: pair.kpiAId } }),
                        db.approvedKPI.findUnique({ where: { id: pair.kpiBId } })
                    ]);

                    const nameA = kpiA?.name || 'KPI A';
                    const nameB = kpiB?.name || 'KPI B';
                    const unitA = (kpiA as { unit?: string })?.unit || '';
                    const unitB = (kpiB as { unit?: string })?.unit || '';

                    result = {
                        status: 'success',
                        route: 'COMPARISON_ANALYSIS',
                        kpiAName: nameA,
                        kpiBName: nameB,
                        valueA: valA,
                        valueB: valB,
                        unitA: unitA,
                        unitB: unitB,
                        ratio: ratio,
                        summarySentence: `${nameA} is currently ${valA.toLocaleString()} (${ratio > 1 ? (ratio).toFixed(1) + 'x higher' : (ratio).toFixed(2) + 'x relative'}) compared to ${nameB}.`,
                        confidence: 'deterministic'
                    };

                    updateSessionMemory(sessionId, {
                        lastIntent: 'comparison'
                    });

                    break;
                }
                case 'UNSUPPORTED':
                default: {
                    // Smart fallback: suggest related query types the platform supports
                    const lowerMsg = sanitized.toLowerCase();
                    const suggestions: string[] = [];

                    // Suggest the most likely intended routes based on keywords present
                    if (/\b(revenue|sales|mrr|arr|churn|ltv|cac)\b/i.test(lowerMsg)) {
                        suggestions.push('What is our current revenue?', 'Show revenue trend over the last 3 months');
                    }
                    if (/\b(customer|user|client|subscriber)\b/i.test(lowerMsg)) {
                        suggestions.push('How many active customers do we have?', 'Show customer churn trend');
                    }
                    if (/\b(cost|expense|profit|margin)\b/i.test(lowerMsg)) {
                        suggestions.push('What is our gross margin?', 'Show cost trends over time');
                    }
                    if (suggestions.length === 0) {
                        suggestions.push(
                            'What is our revenue this month?',
                            'Why did our top KPI change last week?',
                            'Compare revenue vs expenses',
                            'Show me an overview of all KPIs'
                        );
                    }

                    result = {
                        status: 'unsupported',
                        route: 'UNSUPPORTED',
                        message: `I couldn't find a structured reasoning path for that query. I'm specialized in business KPI analysis — try rephrasing around a specific metric, trend, or goal.`,
                        suggestions: suggestions.slice(0, 3),
                    };
                    break;
                }
            }
        } catch (routeErr: unknown) {
            const message = routeErr instanceof Error ? routeErr.message : String(routeErr);
            console.error(`[ask-ai] Route ${finalRoute} handler failed:`, message);
            return NextResponse.json({ status: 'error', route: finalRoute, message: 'An error occurred. Please try again.' });
        }

        // Strip internal metadata before sending to frontend
        const {
            modelMetadata: _meta,
            structuredCommand: _cmd,
            evidence: _ev,
            ...safeResult
        } = result as Record<string, unknown>;

        // Add follow-up suggestions based on updated memory
        const suggestions = getFollowUpSuggestions(getSessionMemory(sessionId));

        // Generate conversational wrapper over the 6A-E layers
        let conversationalPreamble = '';
        if (safeResult.status === 'success' || safeResult.status === 'clarification_required') {
            try {
                const { callLocalModel } = await import('@/lib/module-6/infrastructure/local-adapter');

                // ─── State Injection Pipeline (Module 6 → Module 8 Context) ───────────
                // When the frontend passes a live StrategyCanvasResult, we inject it
                // into the system prompt so the AI answers are strategy-aware.
                let strategyContextBlock = '';
                if (body.strategyContext) {
                    const sc = body.strategyContext;
                    const prob = (sc.probabilityOfSuccess * 100).toFixed(1);
                    const primaryDriver = sc.sensitivity.primaryDriver;
                    const riskFactor = sc.sensitivity.riskFactor;
                    const baselineEnd = sc.scenarios.baseline[sc.scenarios.baseline.length - 1]?.yhat ?? 0;
                    strategyContextBlock = `
--- ACTIVE STRATEGY CONTEXT (DO NOT REVEAL THE RAW JSON TO THE USER) ---
The user is currently evaluating a strategy simulation.
Probability of Success: ${prob}%
Data Reliability Score: ${sc.reliabilityScore}/100
Baseline Forecast End Value: ${baselineEnd.toFixed(0)}
Primary Growth Driver: ${primaryDriver}
Key Risk Factor: ${riskFactor}
For any strategy-related questions, reference these numbers directly in your answer.
--- END CONTEXT ---`;
                }

                const systemPrompt = `You are VistaraBI, an evidence-governed BI copilot.
Write a 1-sentence, natural, conversational response acknowledging the result.
RULES:
1. DO NOT hallucinate numbers. Use only the numbers provided.
2. DO NOT use words like "because", "due to", or infer causation unless explicitly in the payload.
3. Keep it extremely brief and friendly. No markdown. If the payload is 'clarification_required', ask the user to clarify.${strategyContextBlock}`;

                const userPrompt = `The user said: "${activeQuery}"
The underlying analytical engines (6A-6E) produced this structured payload:
${JSON.stringify({ ...safeResult, dataset: undefined })} // Intentionally omitting dataset arrays from prompt to save context length`;

                const response = await callLocalModel(systemPrompt, userPrompt, 0.3);
                conversationalPreamble = response.text || '';
            } catch (err) {
                console.warn('[ask-ai] Failed to generate conversational wrapper:', err);
                conversationalPreamble = (safeResult.narrative as string) || (safeResult.summarySentence as string) || (safeResult.explanation as string) || '';
            }
        }

        return NextResponse.json({ route: finalRoute, ...safeResult, conversationalPreamble, suggestions });

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        console.error('[ask-ai] Unhandled error:', message);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
