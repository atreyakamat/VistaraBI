// AI KPI Discovery Engine - Module 4 Phase 4C
// Invents meaningful KPIs from data columns using Ollama

import db from '@/lib/prisma';
import type { DomainType } from '@/lib/prisma';
import { getGovernedDomain } from '@/lib/domain/governance';
import { checkOllamaHealth, generateKPISuggestions } from '@/lib/ai/ollama-client';
import { loadBlueprintWithKPIs } from '@/lib/kpi/blueprint-loader';
import { getDerivedKPIsForDomain, checkDerivedKPIDependencies, type DerivedKPIDefinition } from './derived-kpi-library';

// Model override for KPI discovery — using qwen3:0.6b as it is lightweight and recommended
const KPI_DISCOVERY_MODEL = process.env.OLLAMA_MODEL || 'qwen3:0.6b';

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

interface DiscoveryDebug {
    steps: string[];
    ollamaReady?: boolean;
    context?: {
        domain: DomainType;
        columnCount: number;
        columns: string[];
    };
    inventedKpis?: { name: string; formula: string }[];
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

// ─── Formula → Aggregation Parser ────────────────────────────────────────────

/**
 * Extract a structured aggregation rule from a formula string like
 * "SUM(order_value)", "COUNT(order_id)", "AVG(unit_price) / COUNT(order_id)"
 * Falls back to SUM on the first column mentioned if no function found.
 */
function formulaToAggregation(
    formula: string,
    availableColumns: string[]
): { function: string; column: string } | null {
    // Try to match AGG_FUNC(column_name)
    const fnMatch = formula.match(/\b(SUM|COUNT|AVG|MIN|MAX|COUNT_DISTINCT|DISTINCT_COUNT)\s*\(\s*([\w_]+)\s*\)/i);
    if (fnMatch) {
        const fn = fnMatch[1].toUpperCase();
        const col = fnMatch[2];
        // Verify col is a real column
        const matched = availableColumns.find(c => c.toLowerCase() === col.toLowerCase());
        if (matched) return { function: fn, column: matched };
    }
    // Fallback: find any known column mentioned in the formula
    for (const col of availableColumns) {
        if (formula.toLowerCase().includes(col.toLowerCase())) {
            return { function: 'SUM', column: col };
        }
    }
    return null;
}

// Invent KPIs from columns using Ollama
async function inventKPIsFromColumns(context: DiscoveryContext): Promise<AIKPIProposal[]> {
    console.log('[AI-Discovery] 🤖 Starting Ollama KPI invention...');

    if (context.allColumns.length === 0) {
        console.log('[AI-Discovery] ❌ No columns to analyze');
        return [];
    }

    // Build sample rows for generateKPISuggestions
    const sampleRows: Record<string, unknown>[] = [];
    const sampleCols = context.allColumns.slice(0, 15);
    for (let i = 0; i < 5; i++) {
        const row: Record<string, unknown> = {};
        for (const col of sampleCols) {
            const samples = context.sampleValues[col] || [];
            row[col] = samples[i] ?? samples[0] ?? null;
        }
        sampleRows.push(row);
    }

    console.log('[AI-Discovery] 📤 Calling Ollama KPI suggestions (model: ' + KPI_DISCOVERY_MODEL + ')...');

    try {
        // generateKPISuggestions uses generateSimple internally.
        // Override to a more capable model by temporarily setting env.
        // We call it with the columns and ask for ecommerce-specific KPIs.
        const suggestions = await generateKPISuggestions(
            sampleCols,
            sampleRows,
            context.domain
        );

        console.log('[AI-Discovery] 📥 Got', suggestions.length, 'suggestions from Ollama');

        if (suggestions.length === 0) {
            console.warn('[AI-Discovery] ⚠️ Ollama returned no KPI suggestions (model may be too small)');
            return [];
        }

        // Convert to AIKPIProposal format, parsing formula → aggregation
        const proposals: AIKPIProposal[] = [];

        for (let idx = 0; idx < suggestions.length; idx++) {
            const kpi = suggestions[idx];
            if (!kpi.name || !kpi.formula) continue;

            // Validate formula references real columns (hallucination guard)
            const agg = formulaToAggregation(kpi.formula, context.allColumns);
            if (!agg) {
                console.log('[AI-Discovery]   ⚠️ Skipping KPI (no real column in formula):', kpi.name, '|', kpi.formula);
                continue;
            }

            const contributingColumns = context.allColumns.filter(col =>
                kpi.formula.toLowerCase().includes(col.toLowerCase())
            );

            console.log('[AI-Discovery]   ✓ KPI:', kpi.name, '| Agg:', agg.function + '(' + agg.column + ')', '| Cols:', contributingColumns.join(', '));

            proposals.push({
                id: `ai-inv-${Date.now()}-${idx}`,
                projectId: context.projectId,
                kpiName: kpi.name,
                description: kpi.explanation || kpi.name,
                formula: kpi.formula,
                category: kpi.category || 'derived',
                contributingColumns,
                derivedFrom: [],
                isDerived: false,
                businessMeaning: kpi.explanation || 'AI-suggested KPI',
                whyItMatters: `Domain-specific insight for ${context.domain}`,
                confidenceScore: 82,
                domain: context.domain,
                sourceType: 'AI_INVENTED' as const,
                status: 'PENDING' as const,
                ollamaModel: KPI_DISCOVERY_MODEL,
                createdAt: new Date(),
                // Store aggregation so blueprint route can use it
                _aggregation: agg,
                _sourceTable: contributingColumns[0] ? 'merged_data' : 'unknown',
            } as AIKPIProposal & { _aggregation: { function: string; column: string }; _sourceTable: string });
        }

        console.log('[AI-Discovery] ✓ Created', proposals.length, 'valid AI-invented proposals');
        return proposals;

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('[AI-Discovery] ❌ Ollama error:', errorMessage);
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
        const { canCompute } = checkDerivedKPIDependencies(
            derived,
            context.existingKpiIds
        );

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
    debug: DiscoveryDebug;
}> {
    console.log('\n========================================');
    console.log('[AI-Discovery] 🚀 STARTING AI KPI DISCOVERY');
    console.log('[AI-Discovery] Project:', projectId);
    console.log('========================================\n');

    const debug: DiscoveryDebug = { steps: [] };

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

interface ProposalMetadata {
    description: string;
    category: string;
    contributingColumns: string[];
    derivedFrom: string[];
    isDerived: boolean;
    businessMeaning: string;
    whyItMatters: string;
    ollamaModel: string;
    sourceType: AIKPIProposal['sourceType'];
}

// Store proposals in database
async function storeProposals(projectId: string, proposals: AIKPIProposal[]): Promise<void> {
    const existing = await db.aIKpiProposal.findMany({ where: { projectId } });
    const existingIds = new Set(existing.map(p => p.id));
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
                },
                reviewedAt: proposal.reviewedAt,
                reviewedBy: proposal.reviewedBy
            }
        });
    }

    console.log('[AI-Discovery] 💾 Stored', newProposals.length, 'new proposals');
}

// Get all proposals for a project
export async function getAIKPIProposals(projectId: string): Promise<AIKPIProposal[]> {
    const dbProposals = await db.aIKpiProposal.findMany({ where: { projectId } });

    return dbProposals.map(p => {
        const metadata = (p.metadata as unknown as ProposalMetadata) || {};
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
            status: p.status as AIKPIProposal['status'],
            ollamaModel: metadata.ollamaModel || 'unknown',
            createdAt: p.proposedAt,
            reviewedAt: p.reviewedAt || undefined,
            reviewedBy: p.reviewedBy || undefined
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
        },
    });

    // Simple fetch
    const p = await db.aIKpiProposal.findUnique({ where: { id: proposalId } });
    if (!p) return null;

    const meta = (p.metadata as unknown as ProposalMetadata) || {};

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
        status: p.status as AIKPIProposal['status'],
        ollamaModel: meta.ollamaModel || 'unknown',
        createdAt: p.proposedAt,
        reviewedAt: p.reviewedAt || undefined,
        reviewedBy: p.reviewedBy || undefined
    };
}

export type { DerivedKPIDefinition };
