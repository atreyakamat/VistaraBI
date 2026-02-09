// AI Relationship Validator - Module 4D-A
// Uses Ollama to validate ambiguous relationships

import { generateCompletion, checkOllamaHealth } from '@/lib/ai/ollama-client';
import { AIValidationResult, ConfidenceFactors } from '@/lib/prisma';
import { RelationshipCandidate, calculateConfidence } from './relationship-detector';

// Threshold for triggering AI validation
const AMBIGUITY_THRESHOLD = {
    min: 0.4,  // Below this, reject outright
    max: 0.7,  // Above this, accept without AI
};

// Check if a relationship needs AI validation
export function needsAIValidation(confidence: number): boolean {
    return confidence >= AMBIGUITY_THRESHOLD.min && confidence < AMBIGUITY_THRESHOLD.max;
}

// Validate a relationship using Ollama
export async function validateRelationship(
    candidate: RelationshipCandidate,
    sourceSamples: unknown[],
    targetSamples: unknown[]
): Promise<AIValidationResult> {
    console.log('[AIValidator] Validating relationship:',
        `${candidate.sourceTableName}.${candidate.sourceColumn} → ` +
        `${candidate.targetTableName}.${candidate.targetColumn}`
    );

    // Check if Ollama is available
    const isAvailable = await checkOllamaHealth();
    if (!isAvailable) {
        console.log('[AIValidator] Ollama not available, skipping AI validation');
        return {
            validated: true, // Accept as-is if AI unavailable
            reasoning: 'AI validation skipped - Ollama not available',
        };
    }

    const confidence = calculateConfidence(candidate.confidenceFactors);
    const prompt = buildValidationPrompt(candidate, sourceSamples, targetSamples, confidence);

    try {
        const response = await generateCompletion({
            messages: [
                {
                    role: 'system',
                    content: 'You are a data relationship expert. Analyze if two columns likely represent the same business entity and can be joined. Be concise and respond with JSON only.',
                },
                {
                    role: 'user',
                    content: prompt,
                },
            ],
            temperature: 0.2,
        });

        return parseValidationResponse(response, candidate);
    } catch (error) {
        console.error('[AIValidator] Validation failed:', error);
        return {
            validated: true,
            reasoning: 'AI validation failed, accepting based on rule-based confidence',
        };
    }
}

// Build validation prompt
function buildValidationPrompt(
    candidate: RelationshipCandidate,
    sourceSamples: unknown[],
    targetSamples: unknown[],
    confidence: number
): string {
    const sourceTable = candidate.sourceTableName.replace(/\.[^.]+$/, '');
    const targetTable = candidate.targetTableName.replace(/\.[^.]+$/, '');

    const sourceSampleStr = sourceSamples
        .slice(0, 5)
        .filter(v => v !== null && v !== undefined)
        .map(v => String(v))
        .join(', ');

    const targetSampleStr = targetSamples
        .slice(0, 5)
        .filter(v => v !== null && v !== undefined)
        .map(v => String(v))
        .join(', ');

    const factors = candidate.confidenceFactors;

    return `Analyze if these two columns represent the same business entity and can be joined:

Source: ${sourceTable}.${candidate.sourceColumn}
Sample values: [${sourceSampleStr}]

Target: ${targetTable}.${candidate.targetColumn}  
Sample values: [${targetSampleStr}]

Detection scores:
- Name similarity: ${Math.round(factors.nameScore * 100)}%
- Value overlap: ${Math.round(factors.overlapScore * 100)}%
- Target uniqueness: ${Math.round(factors.uniquenessScore * 100)}%
- Data type match: ${Math.round(factors.dataTypeScore * 100)}%
- Combined confidence: ${Math.round(confidence * 100)}%

Are these columns likely the same business entity? Respond with JSON only:
{"validated": true/false, "reasoning": "brief explanation", "adjustedConfidence": 0.0-1.0}`;
}

// Parse AI validation response
function parseValidationResponse(
    response: string,
    candidate: RelationshipCandidate
): AIValidationResult {
    try {
        // Extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*?\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                validated: parsed.validated ?? true,
                reasoning: parsed.reasoning || 'AI validation completed',
                adjustedConfidence: parsed.adjustedConfidence,
            };
        }
    } catch (e) {
        console.error('[AIValidator] Failed to parse response:', e);
    }

    // Default: accept with original confidence
    return {
        validated: true,
        reasoning: response.substring(0, 200),
    };
}

// Batch validate multiple ambiguous relationships
export async function batchValidateRelationships(
    candidates: RelationshipCandidate[],
    sourceData: Map<string, Map<string, unknown[]>> // tableId -> column -> values
): Promise<Map<string, AIValidationResult>> {
    const results = new Map<string, AIValidationResult>();

    for (const candidate of candidates) {
        const confidence = calculateConfidence(candidate.confidenceFactors);

        if (!needsAIValidation(confidence)) {
            // Skip AI validation for high/low confidence
            results.set(candidate.sourceColumn + '-' + candidate.targetColumn, {
                validated: confidence >= AMBIGUITY_THRESHOLD.max,
                reasoning: confidence >= AMBIGUITY_THRESHOLD.max
                    ? 'High confidence, no AI validation needed'
                    : 'Low confidence, rejected without AI validation',
            });
            continue;
        }

        // Get sample values
        const sourceValues = sourceData.get(candidate.sourceTableId)?.get(candidate.sourceColumn) || [];
        const targetValues = sourceData.get(candidate.targetTableId)?.get(candidate.targetColumn) || [];

        const result = await validateRelationship(candidate, sourceValues, targetValues);
        results.set(candidate.sourceColumn + '-' + candidate.targetColumn, result);
    }

    return results;
}

export { AMBIGUITY_THRESHOLD };
