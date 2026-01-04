// AI Semantic Domain Reasoning Engine (Module 3 Phase 3C)
// Provides semantic understanding and explainable AI suggestions for domain classification

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import {
    checkOllamaHealth,
    generateCompletion,
    buildDomainReasoningPrompt,
    parseAIDomainResponse,
    type AIDomainSuggestion,
} from '@/lib/ai/ollama-client';

// AI Domain Reasoning Record
export interface AIDomainReasoning {
    id: string;
    projectId: string;
    primaryDomain: DomainType | null;
    primaryConfidence: number;
    secondaryDomain: DomainType | null;
    secondaryConfidence: number;
    reasoning: string;
    keySignals: string[];
    phase3AConfidence: number;      // Original Phase 3A confidence
    fusedConfidence: number;        // Combined AI + rule-based confidence
    ollamaModel: string;
    processingTimeMs: number;
    createdAt: Date;
}

// Gather dataset summary for AI analysis
async function gatherDataSummary(projectId: string): Promise<{
    columns: string[];
    normalizedColumns: string[];
    sampleValues: Record<string, string[]>;
    rowCount: number;
    sourceCount: number;
}> {
    const sources = await db.source.findMany({ where: { projectId } });

    const allColumns: string[] = [];
    const allNormalizedColumns: string[] = [];
    const sampleValues: Record<string, string[]> = {};
    let totalRows = 0;

    for (const source of sources) {
        totalRows += source.rowCount || 0;

        for (const col of source.columns || []) {
            allColumns.push(col);
            // Normalize: lowercase, remove special chars
            allNormalizedColumns.push(col.toLowerCase().replace(/[_\-\s]+/g, ''));

            // Get sample values from first few rows
            if (source.data && source.data.length > 0) {
                const samples = source.data
                    .slice(0, 5)
                    .map((row: Record<string, any>) => String(row[col] || ''))
                    .filter((v: string) => v && v !== 'null' && v !== 'undefined');
                if (samples.length > 0) {
                    sampleValues[col] = samples;
                }
            }
        }
    }

    return {
        columns: [...new Set(allColumns)],
        normalizedColumns: [...new Set(allNormalizedColumns)],
        sampleValues,
        rowCount: totalRows,
        sourceCount: sources.length,
    };
}

// Fuse AI confidence with Phase 3A confidence
function fuseConfidence(phase3AConfidence: number, aiConfidence: number): number {
    // Weighted average: 60% rule-based, 40% AI
    // This ensures rule-based remains primary, AI acts as booster
    const weight3A = 0.6;
    const weightAI = 0.4;

    const fused = (phase3AConfidence * weight3A) + (aiConfidence * weightAI);
    return Math.round(fused);
}

// Main AI reasoning function
export async function performAIDomainReasoning(
    projectId: string,
    phase3AConfidence: number = 0
): Promise<AIDomainReasoning | null> {
    console.log('[AI-Domain] Starting semantic domain reasoning for project:', projectId);
    const startTime = Date.now();

    // Check if Ollama is available
    const ollamaAvailable = await checkOllamaHealth();
    if (!ollamaAvailable) {
        console.warn('[AI-Domain] Ollama not available, skipping AI reasoning');
        return null;
    }

    try {
        // Get project name
        const project = await db.project.findUnique({ where: { id: projectId } });
        if (!project) {
            console.error('[AI-Domain] Project not found');
            return null;
        }

        // Gather data summary
        const dataSummary = await gatherDataSummary(projectId);

        if (dataSummary.columns.length === 0) {
            console.log('[AI-Domain] No columns to analyze');
            return null;
        }

        console.log('[AI-Domain] Analyzing', dataSummary.columns.length, 'columns,', dataSummary.rowCount, 'rows');

        // Build prompt and call Ollama
        const messages = buildDomainReasoningPrompt(project.name, dataSummary);

        const response = await generateCompletion({
            messages,
            temperature: 0.3, // Low temperature for consistent results
        });

        // Parse AI response
        const suggestion = parseAIDomainResponse(response);

        const processingTime = Date.now() - startTime;
        console.log('[AI-Domain] Reasoning complete in', processingTime, 'ms');
        console.log('[AI-Domain] Suggested:', suggestion.primaryDomain, 'at', suggestion.confidence, '%');

        // Create reasoning record
        const reasoning: AIDomainReasoning = {
            id: randomUUID(),
            projectId,
            primaryDomain: suggestion.primaryDomain as DomainType | null,
            primaryConfidence: suggestion.confidence,
            secondaryDomain: suggestion.secondaryDomain as DomainType | null,
            secondaryConfidence: suggestion.secondaryConfidence,
            reasoning: suggestion.reasoning,
            keySignals: suggestion.keySignals,
            phase3AConfidence,
            fusedConfidence: fuseConfidence(phase3AConfidence, suggestion.confidence),
            ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:0.6b',
            processingTimeMs: processingTime,
            createdAt: new Date(),
        };

        // Store in database
        await db.aiDomainReasoning.upsert({
            where: { projectId },
            data: reasoning,
        });

        console.log('[AI-Domain] Reasoning stored. Fused confidence:', reasoning.fusedConfidence, '%');

        return reasoning;
    } catch (error) {
        console.error('[AI-Domain] Reasoning error:', error);
        return null;
    }
}

// Get existing AI reasoning for a project
export async function getAIDomainReasoning(projectId: string): Promise<AIDomainReasoning | null> {
    return await db.aiDomainReasoning.findUnique({ where: { projectId } });
}

// Check if AI reasoning should be invoked
export function shouldInvokeAIReasoning(phase3AConfidence: number): boolean {
    // Invoke AI when:
    // 1. Phase 3A confidence is below auto-assign threshold (60%)
    // 2. Phase 3A confidence is borderline (50-70%)
    return phase3AConfidence < 70;
}

// Combine Phase 3A and Phase 3C for final domain decision
export async function getEnhancedDomainClassification(projectId: string): Promise<{
    domain: DomainType | null;
    confidence: number;
    source: 'rule-based' | 'ai-enhanced' | 'ai-suggested';
    aiReasoning: AIDomainReasoning | null;
}> {
    // Get Phase 3A detection
    const detection = await db.domainDetection.findUnique({ where: { projectId } });

    // Get Phase 3C AI reasoning
    const aiReasoning = await getAIDomainReasoning(projectId);

    if (!detection && !aiReasoning) {
        return {
            domain: null,
            confidence: 0,
            source: 'rule-based',
            aiReasoning: null,
        };
    }

    // If no AI reasoning, use pure Phase 3A
    if (!aiReasoning) {
        return {
            domain: detection?.detectedDomain || null,
            confidence: detection?.confidence || 0,
            source: 'rule-based',
            aiReasoning: null,
        };
    }

    // If Phase 3A has high confidence, use it but include AI for context
    if (detection && detection.confidence >= 60) {
        return {
            domain: detection.detectedDomain,
            confidence: detection.confidence,
            source: 'rule-based',
            aiReasoning,
        };
    }

    // If AI agrees with Phase 3A (same domain), boost confidence
    if (detection && aiReasoning.primaryDomain === detection.detectedDomain) {
        return {
            domain: detection.detectedDomain,
            confidence: aiReasoning.fusedConfidence,
            source: 'ai-enhanced',
            aiReasoning,
        };
    }

    // If AI has higher confidence than Phase 3A, suggest AI domain
    if (aiReasoning.primaryConfidence > (detection?.confidence || 0)) {
        return {
            domain: aiReasoning.primaryDomain,
            confidence: aiReasoning.primaryConfidence,
            source: 'ai-suggested',
            aiReasoning,
        };
    }

    // Default to Phase 3A
    return {
        domain: detection?.detectedDomain || null,
        confidence: detection?.confidence || 0,
        source: 'rule-based',
        aiReasoning,
    };
}
