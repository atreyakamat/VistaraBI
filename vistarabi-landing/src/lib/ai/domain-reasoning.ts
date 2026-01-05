// Ollama-Augmented Domain Reasoning Engine (Module 3C)
// Invokes AI ONLY when rule-based detection is weak/ambiguous
// Never blindly overrides - acts as semantic validator and recommender

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import {
    checkOllamaHealth,
    generateCompletion,
    buildSemanticReasoningPrompt,
    parseSemanticResponse,
    type SemanticReasoningContext,
    type SemanticDomainSuggestion,
} from '@/lib/ai/ollama-client';

// Confidence thresholds
const AUTO_ASSIGN_THRESHOLD = 60;  // Above this: auto-assign domain
const AI_INVOKE_THRESHOLD = 60;    // Below this: invoke AI for help
const COMBINED_AUTO_THRESHOLD = 70; // Combined confidence needed for auto-assign

// AI Domain Reasoning Record (for audit and explainability)
export interface AIDomainReasoning {
    id: string;
    projectId: string;
    // Rule-based detection results
    ruleBasedDomain: DomainType | null;
    ruleBasedConfidence: number;
    matchedColumns: string[];
    unmatchedColumns: string[];
    // AI semantic analysis
    aiRecommendedDomain: DomainType | null;
    aiSemanticConfidence: number;
    aiAlternativeDomain: DomainType | null;
    aiAlternativeConfidence: number;
    aiReasoning: string;
    aiSemanticSignals: string[];
    aiColumnInsights: string;
    // Combined results
    combinedConfidence: number;
    finalDomain: DomainType | null;
    wasAutoAssigned: boolean;
    // Metadata
    ollamaModel: string;
    processingTimeMs: number;
    createdAt: Date;
}

// Gather context for semantic reasoning
async function gatherSemanticContext(
    projectId: string,
    ruleDetection: any
): Promise<SemanticReasoningContext> {
    const project = await db.project.findUnique({ where: { id: projectId } });
    const sources = await db.source.findMany({ where: { projectId } });

    // Extract sample values from unmatched columns
    const sampleValues: Record<string, string[]> = {};
    const unmatchedColumns = ruleDetection?.unmatchedColumns || [];

    for (const source of sources) {
        if (source.data && source.data.length > 0) {
            for (const col of unmatchedColumns.slice(0, 15)) {
                if (!sampleValues[col]) {
                    const samples = source.data
                        .slice(0, 5)
                        .map((row: Record<string, any>) => String(row[col] || ''))
                        .filter((v: string) => v && v !== 'null' && v !== 'undefined' && v.length < 50);
                    if (samples.length > 0) {
                        sampleValues[col] = samples;
                    }
                }
            }
        }
    }

    // Build matched columns info
    const matchedColumns = (ruleDetection?.matchedColumns || []).map((col: string) => ({
        column: col,
        domain: ruleDetection?.detectedDomain || 'UNKNOWN',
        keyword: col,
    }));

    const totalRows = sources.reduce((sum, s) => sum + (s.rowCount || 0), 0);

    return {
        projectName: project?.name || 'Unknown Project',
        matchedColumns,
        unmatchedColumns,
        sampleValues,
        ruleBasedScores: ruleDetection?.scoringBreakdown || {},
        topDomain: ruleDetection?.detectedDomain || null,
        topConfidence: ruleDetection?.confidence || 0,
        totalRows,
    };
}

// Calculate combined confidence using weighted fusion
function calculateCombinedConfidence(
    ruleConfidence: number,
    aiConfidence: number,
    domainsMatch: boolean
): number {
    if (domainsMatch) {
        // Domains agree - boost confidence significantly
        // Weighted: 55% rule-based + 45% AI (slight rule preference)
        const base = (ruleConfidence * 0.55) + (aiConfidence * 0.45);
        // Bonus for agreement
        const agreementBonus = Math.min(15, (ruleConfidence + aiConfidence) / 10);
        return Math.min(100, Math.round(base + agreementBonus));
    } else {
        // Domains disagree - use weighted average, no bonus
        // Rule-based gets more weight since it's deterministic
        return Math.round((ruleConfidence * 0.6) + (aiConfidence * 0.4));
    }
}

// Main: Perform semantic domain reasoning
export async function performSemanticReasoning(
    projectId: string
): Promise<AIDomainReasoning | null> {
    console.log('[AI-Domain] Starting semantic reasoning for project:', projectId);
    const startTime = Date.now();

    // Get existing rule-based detection
    const ruleDetection = await db.domainDetection.findUnique({ where: { projectId } });

    if (!ruleDetection) {
        console.log('[AI-Domain] No rule-based detection found');
        return null;
    }

    const ruleConfidence = ruleDetection.confidence || 0;
    console.log('[AI-Domain] Rule-based confidence:', ruleConfidence);

    // Check if AI assistance is needed
    if (ruleConfidence >= AI_INVOKE_THRESHOLD) {
        console.log('[AI-Domain] Rule-based confidence is strong, AI not needed');
        return null;
    }

    // Check Ollama availability
    const ollamaAvailable = await checkOllamaHealth();
    if (!ollamaAvailable) {
        console.warn('[AI-Domain] Ollama not available');
        return null;
    }

    try {
        // Gather semantic context
        const context = await gatherSemanticContext(projectId, ruleDetection);

        if (context.unmatchedColumns.length === 0 && context.matchedColumns.length === 0) {
            console.log('[AI-Domain] No columns to analyze');
            return null;
        }

        console.log('[AI-Domain] Analyzing', context.unmatchedColumns.length, 'unmatched columns');

        // Build prompt and call Ollama
        const messages = buildSemanticReasoningPrompt(context);
        const response = await generateCompletion({ messages, temperature: 0.2 });

        // Parse response
        const suggestion = parseSemanticResponse(response);

        const processingTime = Date.now() - startTime;
        console.log('[AI-Domain] Semantic analysis complete in', processingTime, 'ms');
        console.log('[AI-Domain] AI recommends:', suggestion.recommendedDomain, 'at', suggestion.semanticConfidence, '%');

        // Calculate combined confidence
        const domainsMatch = suggestion.recommendedDomain === ruleDetection.detectedDomain;
        const combinedConfidence = calculateCombinedConfidence(
            ruleConfidence,
            suggestion.semanticConfidence,
            domainsMatch
        );

        // Determine final domain and auto-assignment
        let finalDomain: DomainType | null;
        let wasAutoAssigned: boolean;

        if (combinedConfidence >= COMBINED_AUTO_THRESHOLD) {
            // Combined confidence is high enough - auto-assign
            finalDomain = domainsMatch
                ? ruleDetection.detectedDomain
                : (suggestion.semanticConfidence > ruleConfidence
                    ? suggestion.recommendedDomain as DomainType
                    : ruleDetection.detectedDomain);
            wasAutoAssigned = true;
            console.log('[AI-Domain] Auto-assigning domain:', finalDomain, 'at', combinedConfidence, '%');
        } else {
            // Still ambiguous - require user selection
            finalDomain = null;
            wasAutoAssigned = false;
            console.log('[AI-Domain] Combined confidence', combinedConfidence, '% still below threshold, needs user input');
        }

        // Create reasoning record
        const reasoning: AIDomainReasoning = {
            id: randomUUID(),
            projectId,
            // Rule-based
            ruleBasedDomain: ruleDetection.detectedDomain,
            ruleBasedConfidence: ruleConfidence,
            matchedColumns: ruleDetection.matchedColumns || [],
            unmatchedColumns: context.unmatchedColumns,
            // AI
            aiRecommendedDomain: suggestion.recommendedDomain as DomainType | null,
            aiSemanticConfidence: suggestion.semanticConfidence,
            aiAlternativeDomain: suggestion.alternativeDomain as DomainType | null,
            aiAlternativeConfidence: suggestion.alternativeConfidence,
            aiReasoning: suggestion.reasoning,
            aiSemanticSignals: suggestion.semanticSignals,
            aiColumnInsights: suggestion.ambiguousColumnInsights,
            // Combined
            combinedConfidence,
            finalDomain,
            wasAutoAssigned,
            // Meta
            ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:0.6b',
            processingTimeMs: processingTime,
            createdAt: new Date(),
        };

        // Store in database
        await db.aiDomainReasoning.upsert({
            where: { projectId },
            data: reasoning,
        });

        return reasoning;
    } catch (error) {
        console.error('[AI-Domain] Semantic reasoning error:', error);
        return null;
    }
}

// Get existing AI reasoning for a project
export async function getAIDomainReasoning(projectId: string): Promise<AIDomainReasoning | null> {
    return await db.aiDomainReasoning.findUnique({ where: { projectId } });
}

// Check if AI reasoning should be invoked for a detection
export function shouldInvokeAI(ruleConfidence: number): boolean {
    return ruleConfidence < AI_INVOKE_THRESHOLD;
}

// Get enhanced classification combining rule-based and AI
export async function getEnhancedClassification(projectId: string): Promise<{
    domain: DomainType | null;
    confidence: number;
    source: 'rule-based' | 'ai-enhanced' | 'ai-recommended' | 'needs-selection';
    aiReasoning: AIDomainReasoning | null;
    ruleDetection: any;
}> {
    const ruleDetection = await db.domainDetection.findUnique({ where: { projectId } });
    const aiReasoning = await getAIDomainReasoning(projectId);

    // No detection at all
    if (!ruleDetection) {
        return {
            domain: null,
            confidence: 0,
            source: 'needs-selection',
            aiReasoning: null,
            ruleDetection: null,
        };
    }

    // Rule-based is strong enough
    if (ruleDetection.confidence >= AUTO_ASSIGN_THRESHOLD) {
        return {
            domain: ruleDetection.detectedDomain,
            confidence: ruleDetection.confidence,
            source: 'rule-based',
            aiReasoning,
            ruleDetection,
        };
    }

    // AI helped and auto-assigned
    if (aiReasoning?.wasAutoAssigned && aiReasoning.finalDomain) {
        return {
            domain: aiReasoning.finalDomain,
            confidence: aiReasoning.combinedConfidence,
            source: aiReasoning.aiRecommendedDomain === aiReasoning.finalDomain
                ? 'ai-recommended'
                : 'ai-enhanced',
            aiReasoning,
            ruleDetection,
        };
    }

    // Still needs user selection
    return {
        domain: ruleDetection.detectedDomain,
        confidence: aiReasoning?.combinedConfidence || ruleDetection.confidence,
        source: 'needs-selection',
        aiReasoning,
        ruleDetection,
    };
}
