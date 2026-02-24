// AI KPI Discovery Engine - Module 4 Phase 4C
// Invents meaningful KPIs from data columns using Ollama

import { randomUUID } from 'crypto';
import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import { getGovernedDomain } from '@/lib/domain/governance';
import { checkOllamaHealth, generateCompletion } from '@/lib/ai/ollama-client';
import { loadBlueprintWithKPIs } from '@/lib/kpi/blueprint-loader';
import { getDerivedKPIsForDomain, checkDerivedKPIDependencies, type DerivedKPIDefinition } from './derived-kpi-library';

// AI KPI Proposal - invented KPIs suggested by AI
export interface AIKPIProposal {
    id: string;
    projectId: string;
    kpiName: string;
    description: string;
    formula: string;
    category: string;
    contributingColumns: string[];
    derivedFrom: string[];
    isDerived: boolean;
    businessMeaning: string;
    whyItMatters: string;
    confidenceScore: number;
    domain: DomainType;
    sourceType: 'AI_INVENTED' | 'LIBRARY_DERIVED' | 'AI_DERIVED';
    status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'MODIFIED';
    ollamaModel: string;
    createdAt: Date;
    reviewedAt?: Date;
    reviewedBy?: string;
}

// Discovery Context for AI
interface DiscoveryContext {
    projectId: string;
    domain: DomainType;
    allColumns: string[];
    sampleValues: Record<string, unknown[]>;
    existingKpiIds: string[];
}

// Gather context for AI discovery
async function gatherDiscoveryContext(projectId: string): Promise<DiscoveryContext | null> {
    console.log('[AI-Discovery] Gathering context for project:', projectId);

    const governance = await getGovernedDomain(projectId);
    if (!governance?.activeDomain) {
        console.log('[AI-Discovery] ❌ No governed domain found');
        return null;
    }
    console.log('[AI-Discovery] ✓ Domain:', governance.activeDomain);

    const sources = await db.source.findMany({ where: { projectId } });
    console.log('[AI-Discovery] ✓ Found', sources.length, 'data sources');

    const blueprint = await loadBlueprintWithKPIs(projectId);
    const existingKpiIds = blueprint?.kpis.map(k => k.kpiLibraryId || k.id) || [];

    // Get all columns and sample values
    const allColumns: string[] = [];
    const sampleValues: Record<string, unknown[]> = {};

    for (const source of sources) {
        console.log('[AI-Discovery]   Source:', source.fileName, '- columns:', source.columns?.length || 0);

        if (source.columns) {
            allColumns.push(...source.columns);
        }

        if (source.data && Array.isArray(source.data)) {
            const rows = source.data.slice(0, 10) as Record<string, unknown>[];
            for (const row of rows) {
                for (const [key, value] of Object.entries(row)) {
                    if (!sampleValues[key]) sampleValues[key] = [];
                    if (sampleValues[key].length < 5 && value !== null && value !== undefined) {
                        sampleValues[key].push(value);
                    }
                }
            }
        }
    }

    console.log('[AI-Discovery] ✓ Total columns:', allColumns.length);
    console.log('[AI-Discovery] ✓ Columns with samples:', Object.keys(sampleValues).length);

    return {
        projectId,
        domain: governance.activeDomain,
        allColumns,
        sampleValues,
        existingKpiIds,
    };
}

// Invent KPIs from columns using Ollama
async function inventKPIsFromColumns(context: DiscoveryContext): Promise<AIKPIProposal[]> {
    console.log('[AI-Discovery] 🤖 Starting Ollama KPI invention...');

    if (context.allColumns.length === 0) {
        console.log('[AI-Discovery] ❌ No columns to analyze');
        return [];
    }

    // Build column info with sample values
    const columnInfo = context.allColumns.slice(0, 15).map(col => {
        const samples = context.sampleValues[col] || [];
        const sampleStr = samples.slice(0, 3).map(s => String(s)).join(', ');
        return `- ${col}: ${sampleStr || '(no samples)'}`;
    }).join('\n');

    console.log('[AI-Discovery] 📋 Columns for AI:\n', columnInfo);

    const prompt = `You are a Business Intelligence expert evaluating the ${context.domain} domain.

AVAILABLE WAREHOUSE FIELDS (ONLY use these exact fields):
${columnInfo}

Suggest 4 additional meaningful KPIs based strictly on the available fields above.
ABSOLUTELY NO HALLUCINATED COLUMNS.

Output a structured JSON array. Each object must have:
"name": string
"aggregation": string (e.g. "SUM(order_value)")
"groupBy": string or null
"description": string

Respond ONLY with JSON array:
[{"name":"Revenue Per SKU", "aggregation":"SUM(order_value)", "groupBy":"sku", "description":"Total revenue grouped by SKU"}]`;

    console.log('[AI-Discovery] 📤 Sending prompt to Ollama...');
    console.log('[AI-Discovery] Prompt length:', prompt.length, 'chars');

    try {
        const response = await generateCompletion({
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.5,
        });

        console.log('[AI-Discovery] 📥 Ollama response received');
        console.log('[AI-Discovery] Response length:', response.length, 'chars');
        console.log('[AI-Discovery] Response preview:', response.substring(0, 300));

        // Parse response - look for JSON array
        const jsonMatch = response.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            console.error('[AI-Discovery] ❌ No JSON array found in response');
            console.error('[AI-Discovery] Full response:\n', response);
            return [];
        }

        console.log('[AI-Discovery] ✓ Found JSON array, parsing...');

        const inventedKpis = JSON.parse(jsonMatch[0]) as {
            name: string;
            description: string;
            aggregation: string;
            groupBy: string | null;
        }[];

        console.log('[AI-Discovery] ✓ Parsed', inventedKpis.length, 'KPIs from AI');

        // Convert to AIKPIProposal format
        const proposals = inventedKpis.map((kpi, idx) => {
            const formula = kpi.groupBy && kpi.groupBy !== 'null' ? `${kpi.aggregation} GROUP BY ${kpi.groupBy}` : kpi.aggregation;

            const contributingColumns = context.allColumns.filter(col =>
                formula.toLowerCase().includes(col.toLowerCase())
            );

            // Validation: if no valid columns are used, drop this KPI (hallucination guard)
            if (contributingColumns.length === 0) return null;

            console.log('[AI-Discovery]   KPI:', kpi.name, '| Formula:', formula, '| Uses:', contributingColumns.join(', '));

            return {
                id: `ai-inv-${Date.now()}-${idx}`,
                projectId: context.projectId,
                kpiName: kpi.name,
                description: kpi.description || kpi.name,
                formula: formula,
                category: 'derived',
                contributingColumns,
                derivedFrom: [],
                isDerived: false,
                businessMeaning: kpi.description || 'AI-suggested KPI',
                whyItMatters: 'Domain-specific insight from AI',
                confidenceScore: 85,
                domain: context.domain,
                sourceType: 'AI_INVENTED' as const,
                status: 'PENDING' as const,
                ollamaModel: process.env.OLLAMA_MODEL || 'qwen3:0.6b',
                createdAt: new Date(),
            };
        }).filter(Boolean) as AIKPIProposal[];

        console.log('[AI-Discovery] ✓ Created', proposals.length, 'AI-invented proposals');
        return proposals;

    } catch (error: any) {
        console.error('[AI-Discovery] ❌ Ollama error:', error.message || error);
        console.error('[AI-Discovery] Full error:', error);
        return [];
    }
}

// Match derived KPIs from library based on existing KPIs
function matchDerivedKPIs(context: DiscoveryContext): AIKPIProposal[] {
    console.log('[AI-Discovery] 📚 Checking library for derived KPIs...');

    const derivedKpis = getDerivedKPIsForDomain(context.domain);
    console.log('[AI-Discovery] Found', derivedKpis.length, 'possible derived KPIs for domain:', context.domain);

    const proposals: AIKPIProposal[] = [];

    for (const derived of derivedKpis) {
        const { canCompute, missingDependencies } = checkDerivedKPIDependencies(
            derived,
            context.existingKpiIds
        );

        const metDependencies = derived.dependsOn.filter(dep => context.existingKpiIds.includes(dep));

        // For now, include all derived KPIs with a note about dependencies
        // This helps users see what's possible
        if (derivedKpis.length > 0) {
            proposals.push({
                id: `lib-${derived.id}`,
                projectId: context.projectId,
                kpiName: derived.name,
                description: derived.description,
                formula: derived.formula,
                category: derived.category,
                contributingColumns: [],
                derivedFrom: derived.dependsOn,
                isDerived: true,
                businessMeaning: derived.description,
                whyItMatters: `This ${derived.category} metric helps measure ${derived.name.toLowerCase()} for your ${context.domain} business.`,
                confidenceScore: canCompute ? 95 : 50,
                domain: context.domain,
                sourceType: 'LIBRARY_DERIVED' as const,
                status: 'PENDING' as const,
                ollamaModel: 'library',
                createdAt: new Date(),
            });
        }
    }

    // Sort by confidence and take top 5
    const topProposals = proposals
        .sort((a, b) => b.confidenceScore - a.confidenceScore)
        .slice(0, 5);

    console.log('[AI-Discovery] ✓ Selected', topProposals.length, 'library derived KPIs');
    return topProposals;
}

// Main: Run AI KPI Discovery
export async function runAIKPIDiscovery(projectId: string): Promise<{
    proposals: AIKPIProposal[];
    inventedCount: number;
    derivedCount: number;
    debug: any;
}> {
    console.log('\n========================================');
    console.log('[AI-Discovery] 🚀 STARTING AI KPI DISCOVERY');
    console.log('[AI-Discovery] Project:', projectId);
    console.log('========================================\n');

    const debug: any = { steps: [] };

    // Check Ollama
    console.log('[AI-Discovery] Checking Ollama health...');
    const ollamaReady = await checkOllamaHealth();
    debug.ollamaReady = ollamaReady;

    if (!ollamaReady) {
        console.warn('[AI-Discovery] ⚠️ Ollama not available');
        debug.steps.push('Ollama not available');
    } else {
        console.log('[AI-Discovery] ✓ Ollama is ready');
        debug.steps.push('Ollama ready');
    }

    // Gather context
    const context = await gatherDiscoveryContext(projectId);
    if (!context) {
        console.error('[AI-Discovery] ❌ Failed to gather context');
        debug.steps.push('Context gathering failed');
        return { proposals: [], inventedCount: 0, derivedCount: 0, debug };
    }
    debug.context = {
        domain: context.domain,
        columnCount: context.allColumns.length,
        columns: context.allColumns,
    };
    debug.steps.push('Context gathered: ' + context.allColumns.length + ' columns');

    const allProposals: AIKPIProposal[] = [];

    // 1. Get library derived KPIs
    const derivedProposals = matchDerivedKPIs(context);
    console.log('[AI-Discovery] 📚 Library proposals:', derivedProposals.length);
    allProposals.push(...derivedProposals);
    debug.steps.push('Library KPIs: ' + derivedProposals.length);

    // 2. Invent KPIs using Ollama
    if (ollamaReady) {
        console.log('[AI-Discovery] 🤖 Running Ollama invention...');
        const inventedProposals = await inventKPIsFromColumns(context);
        console.log('[AI-Discovery] 🤖 Invented proposals:', inventedProposals.length);
        allProposals.push(...inventedProposals);
        debug.steps.push('AI invented: ' + inventedProposals.length);
        debug.inventedKpis = inventedProposals.map(p => ({ name: p.kpiName, formula: p.formula }));
    }

    // Store proposals
    await storeProposals(projectId, allProposals);
    debug.steps.push('Stored ' + allProposals.length + ' proposals');

    console.log('\n========================================');
    console.log('[AI-Discovery] ✅ DISCOVERY COMPLETE');
    console.log('[AI-Discovery] Total proposals:', allProposals.length);
    console.log('[AI-Discovery] Invented:', allProposals.filter(p => p.sourceType === 'AI_INVENTED').length);
    console.log('[AI-Discovery] Library:', allProposals.filter(p => p.sourceType === 'LIBRARY_DERIVED').length);
    console.log('========================================\n');

    return {
        proposals: allProposals,
        inventedCount: allProposals.filter(p => p.sourceType === 'AI_INVENTED').length,
        derivedCount: allProposals.filter(p => p.sourceType === 'LIBRARY_DERIVED').length,
        debug,
    };
}

// Store proposals in database
async function storeProposals(projectId: string, proposals: AIKPIProposal[]): Promise<void> {
    const existing = await db.aIKpiProposal.findMany({ where: { projectId } });
    const existingIds = new Set(existing.map((p: any) => p.id));
    const newProposals = proposals.filter(p => !existingIds.has(p.id));

    for (const proposal of newProposals) {
        await db.aIKpiProposal.create({
            data: {
                id: proposal.id,
                projectId: proposal.projectId,
                kpiName: proposal.kpiName,
                formula: proposal.formula,
                rationale: proposal.businessMeaning + '\n\n' + proposal.whyItMatters,
                confidenceScore: proposal.confidenceScore,
                proposedAt: proposal.createdAt || new Date(),
                status: proposal.status,
                metadata: {
                    description: proposal.description,
                    category: proposal.category,
                    contributingColumns: proposal.contributingColumns,
                    derivedFrom: proposal.derivedFrom,
                    isDerived: proposal.isDerived,
                    businessMeaning: proposal.businessMeaning,
                    whyItMatters: proposal.whyItMatters,
                    ollamaModel: proposal.ollamaModel,
                    sourceType: proposal.sourceType
                } as any, // Cast metadata to Json
                reviewedAt: proposal.reviewedAt,
                reviewedBy: proposal.reviewedBy
            } as any,
        });
    }

    console.log('[AI-Discovery] 💾 Stored', newProposals.length, 'new proposals');
}

// Get all proposals for a project
export async function getAIKPIProposals(projectId: string): Promise<AIKPIProposal[]> {
    const dbProposals = await db.aIKpiProposal.findMany({ where: { projectId } });

    return dbProposals.map(p => {
        const pAny = p as any;
        const metadata = (pAny.metadata as any) || {};
        return {
            id: p.id,
            projectId: p.projectId,
            kpiName: p.kpiName,
            formula: p.formula,
            description: metadata.description || '',
            category: metadata.category || 'unknown',
            contributingColumns: metadata.contributingColumns || [],
            derivedFrom: metadata.derivedFrom || [],
            isDerived: metadata.isDerived || false,
            businessMeaning: metadata.businessMeaning || p.rationale.split('\n\n')[0] || '',
            whyItMatters: metadata.whyItMatters || p.rationale.split('\n\n')[1] || '',
            confidenceScore: p.confidenceScore,
            domain: 'UNKNOWN' as DomainType, // Default or infer from project?
            sourceType: metadata.sourceType || 'AI_INVENTED',
            status: p.status as any,
            ollamaModel: metadata.ollamaModel || 'unknown',
            createdAt: p.proposedAt,
            reviewedAt: pAny.reviewedAt || undefined,
            reviewedBy: pAny.reviewedBy || undefined
        };
    });
}

// Update proposal status
export async function updateProposalStatus(
    proposalId: string,
    status: 'APPROVED' | 'REJECTED' | 'MODIFIED',
    userId: string
): Promise<AIKPIProposal | null> {
    await db.aIKpiProposal.update({
        where: { id: proposalId },
        data: {
            status,
            reviewedAt: new Date(),
            reviewedBy: userId,
        } as any,
    });

    // Simple fetch
    const p = await db.aIKpiProposal.findUnique({ where: { id: proposalId } });
    if (!p) return null;

    const pAny = p as any;
    const meta = (pAny.metadata as any) || {};

    return {
        id: p.id,
        projectId: p.projectId,
        kpiName: p.kpiName,
        formula: p.formula,
        description: meta.description || '',
        category: meta.category || 'unknown',
        contributingColumns: meta.contributingColumns || [],
        derivedFrom: meta.derivedFrom || [],
        isDerived: meta.isDerived || false,
        businessMeaning: meta.businessMeaning || p.rationale.split('\n\n')[0] || '',
        whyItMatters: meta.whyItMatters || p.rationale.split('\n\n')[1] || '',
        confidenceScore: p.confidenceScore,
        domain: 'UNKNOWN' as DomainType,
        sourceType: meta.sourceType || 'AI_INVENTED',
        status: p.status as any,
        ollamaModel: meta.ollamaModel || 'unknown',
        createdAt: p.proposedAt,
        reviewedAt: pAny.reviewedAt || undefined,
        reviewedBy: pAny.reviewedBy || undefined
    };
}

export type { DerivedKPIDefinition };
