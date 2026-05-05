// Module 4.5 — KPI Rule & Eligibility Engine — Main Orchestrator
// Pipeline: SemanticInput -> Eligibility -> Resolve -> Blueprint -> DomainContextObject

import type { SemanticInput, DomainContextObject, EligibleKPI } from './semantic-types';
import { evaluateEligibility, summarizeEligibility } from './kpi-eligibility-engine';
import { resolveKPI, SemanticResolutionError } from './semantic-resolver';
import { insertEligibleKPIsIntoBlueprint } from './blueprint-inserter';

/**
 * Main entry point for Module 4.5.
 *
 * Given a SemanticInput (domain + semanticColumnMap + relationships + sources),
 * this function:
 *   1. Evaluates KPI eligibility deterministically
 *   2. Resolves each unlocked KPI to real columns + lineage
 *   3. Persists into Prisma Blueprint tables
 *   4. Returns the DomainContextObject for Module 5 and Module 6
 *
 * This function is 100% deterministic. No AI is involved.
 */
export async function runModule4_5(input: SemanticInput): Promise<DomainContextObject> {
    const prefix = `[Module4.5][${input.projectId}]`;
    console.log(`\n${prefix} ██████████████████████████████████████`);
    console.log(`${prefix} MODULE 4.5 — KPI ELIGIBILITY ENGINE`);
    console.log(`${prefix} Domain:       ${input.domain}`);
    console.log(`${prefix} Semantic Roles: ${Object.keys(input.semanticColumns).length}`);
    console.log(`${prefix} Relationships: ${input.relationships.length}`);
    console.log(`${prefix} Sources:       ${input.sources.length}`);
    console.log(`${prefix} ██████████████████████████████████████\n`);

    // ── Phase 1: Eligibility Evaluation (pure logic, no DB, no AI) ──────────────
    console.log(`${prefix} Phase 1: Evaluating eligibility...`);
    const eligibilityResult = evaluateEligibility(
        input.domain,
        input.semanticColumns,
        input.relationships
    );
    summarizeEligibility(eligibilityResult);

    // ── Phase 2: Resolve unlocked KPIs (throws on failure -> dropped) ────────────
    console.log(`${prefix} Phase 2: Resolving ${eligibilityResult.unlockedKPIs.length} unlocked KPIs...`);
    const resolvedKPIs: EligibleKPI[] = [];
    const resolutionFailures: string[] = [];

    for (const rule of eligibilityResult.unlockedKPIs) {
        try {
            const resolved = resolveKPI(
                rule,
                input.domain,
                input.semanticColumns,
                input.sources,
                input.relationships
            );
            resolvedKPIs.push(resolved);
        } catch (err) {
            if (err instanceof SemanticResolutionError) {
                console.warn(`${prefix} ⚠️  Resolution failed for [${rule.id}] ${rule.name}: ${err.detail}`);
                resolutionFailures.push(rule.id);
            } else {
                console.error(`${prefix} ❌ Unexpected error resolving [${rule.id}]:`, err);
                resolutionFailures.push(rule.id);
            }
        }
    }

    console.log(`${prefix} Phase 2 complete: ${resolvedKPIs.length} resolved, ${resolutionFailures.length} failed resolution`);

    // ── Phase 3: Insert into Blueprint (DB write) ────────────────────────────────
    console.log(`${prefix} Phase 3: Inserting ${resolvedKPIs.length} KPIs into Blueprint...`);
    let blueprintId = '';
    try {
        const insertionResult = await insertEligibleKPIsIntoBlueprint(
            input.projectId,
            input.domain,
            eligibilityResult.unlockedKPIs.filter(r => resolvedKPIs.some(k => k.ruleId === r.id)),
            input
        );
        blueprintId = insertionResult.blueprintId;
        console.log(`${prefix} Phase 3 complete: ${insertionResult.inserted} inserted, ${insertionResult.skipped.length} skipped`);
    } catch (err) {
        console.error(`${prefix} ❌ Blueprint insertion error:`, err);
        // Don't throw — we still return the DomainContextObject even if DB write failed
    }

    // ── Phase 4: Assemble DomainContextObject ───────────────────────────────────
    const domainContext: DomainContextObject = {
        domain: input.domain,
        semanticColumns: input.semanticColumns,
        relationships: input.relationships,
        availableKPIs: resolvedKPIs,
        unlockedCount: resolvedKPIs.length,
        skippedCount: eligibilityResult.skippedKPIs.length + resolutionFailures.length,
        eligibilityLog: eligibilityResult.log,
    };

    console.log(`\n${prefix} ██████████████████████████████████████`);
    console.log(`${prefix} MODULE 4.5 COMPLETE`);
    console.log(`${prefix} Available KPIs: ${domainContext.availableKPIs.length}`);
    console.log(`${prefix} Skipped total:  ${domainContext.skippedCount}`);
    console.log(`${prefix} Blueprint ID:   ${blueprintId || '(not persisted)'}`);
    console.log(`${prefix} ██████████████████████████████████████\n`);

    return domainContext;
}

// ─── Pure evaluation (no DB write) — used by tests and API dry-run ────────────

/**
 * Runs Module 4.5 eligibility and resolution without writing to the database.
 * Useful for previews, tests, and API endpoints that want a dry run.
 */
export function evaluateKPIEligibilityOnly(
    input: Omit<SemanticInput, 'projectId'>
): {
    eligible: EligibleKPI[];
    skipped: { ruleId: string; ruleName: string; reason: string }[];
    log: DomainContextObject['eligibilityLog'];
} {
    const eligibilityResult = evaluateEligibility(
        input.domain,
        input.semanticColumns,
        input.relationships
    );

    const eligible: EligibleKPI[] = [];
    const skipped: { ruleId: string; ruleName: string; reason: string }[] = [
        ...eligibilityResult.skippedKPIs.map(s => ({
            ruleId: s.rule.id,
            ruleName: s.rule.name,
            reason: s.reason,
        })),
    ];

    for (const rule of eligibilityResult.unlockedKPIs) {
        try {
            const resolved = resolveKPI(
                rule,
                input.domain,
                input.semanticColumns,
                input.sources,
                input.relationships
            );
            eligible.push(resolved);
        } catch (err) {
            const detail = err instanceof SemanticResolutionError ? err.detail : String(err);
            skipped.push({ ruleId: rule.id, ruleName: rule.name, reason: detail });
        }
    }

    return { eligible, skipped, log: eligibilityResult.log };
}

// ─── Re-exports for convenience ────────────────────────────────────────────────
export type { SemanticInput, DomainContextObject, EligibleKPI, SemanticColumnMap } from './semantic-types';
export type { KPIRule } from './kpi-rule-registry';
export { KPI_RULE_REGISTRY, getRulesForDomain } from './kpi-rule-registry';
export { evaluateEligibility } from './kpi-eligibility-engine';
export { resolveKPI, SemanticResolutionError } from './semantic-resolver';
