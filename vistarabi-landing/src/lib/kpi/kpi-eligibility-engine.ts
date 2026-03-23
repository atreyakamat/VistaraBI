// Module 4.5 — KPI Eligibility Engine
// Pure deterministic logic. No AI, no fuzzy matching, no fallback.
// Reads from the KPI_RULE_REGISTRY and evaluates semantic column presence
// and relationship graph against each rule's requirements.

import type { DomainType, RelationshipEntry } from '@/lib/prisma';
import type { SemanticColumnMap, EligibilityLogEntry, SemanticRole } from './semantic-types';
import { type KPIRule, getRulesForDomain } from './kpi-rule-registry';

// ─── Eligibility Result ────────────────────────────────────────────────────────

export interface EligibilityResult {
    domain: DomainType;
    unlockedKPIs: KPIRule[];
    skippedKPIs: { rule: KPIRule; reason: string; missingRoles: string[] }[];
    log: EligibilityLogEntry[];
}

// ─── Core Engine ───────────────────────────────────────────────────────────────

/**
 * Determines which KPIs are eligible for a given dataset.
 *
 * Rules:
 * 1. Every requiredSemanticRole must exist in semanticColumns.
 * 2. If requiresJoin=true, the relationship graph must have a valid
 *    RelationshipEntry connecting sources that supply joinedSemanticRoles.
 * 3. No fuzzy matching. No inference. No AI. Binary pass/fail.
 */
export function evaluateEligibility(
    domain: DomainType,
    semanticColumns: SemanticColumnMap,
    relationships: RelationshipEntry[]
): EligibilityResult {
    const prefix = `[Module4.5][${domain}]`;
    console.log(`${prefix} ========================================`);
    console.log(`${prefix} Evaluating KPI eligibility`);
    console.log(`${prefix} Available semantic roles: ${Object.keys(semanticColumns).join(', ')}`);
    console.log(`${prefix} Available relationships: ${relationships.length}`);
    console.log(`${prefix} ========================================`);

    const rules = getRulesForDomain(domain);
    const unlockedKPIs: KPIRule[] = [];
    const skippedKPIs: EligibilityResult['skippedKPIs'] = [];
    const log: EligibilityLogEntry[] = [];

    for (const rule of rules) {
        const result = evaluateRule(rule, semanticColumns, relationships, prefix);

        if (result.eligible) {
            unlockedKPIs.push(rule);
            log.push({ ruleId: rule.id, ruleName: rule.name, status: 'UNLOCKED' });
            console.log(`${prefix} ✅ UNLOCKED: ${rule.name} (${rule.id})`);
        } else {
            skippedKPIs.push({
                rule,
                reason: result.reason,
                missingRoles: result.missingRoles,
            });
            log.push({
                ruleId: rule.id,
                ruleName: rule.name,
                status: 'SKIPPED',
                reason: result.reason,
                missingRoles: result.missingRoles,
            });
            console.log(`${prefix} ❌ SKIPPED: ${rule.name} (${rule.id}) — ${result.reason}`);
        }
    }

    console.log(`${prefix} ========================================`);
    console.log(`${prefix} Unlocked: ${unlockedKPIs.length} / Total: ${rules.length}`);
    console.log(`${prefix} Skipped:  ${skippedKPIs.length}`);
    console.log(`${prefix} ========================================`);

    return { domain, unlockedKPIs, skippedKPIs, log };
}

// ─── Rule Evaluator (private) ──────────────────────────────────────────────────

interface RuleEvalResult {
    eligible: boolean;
    reason: string;
    missingRoles: SemanticRole[];
}

function evaluateRule(
    rule: KPIRule,
    semanticColumns: SemanticColumnMap,
    relationships: RelationshipEntry[],
    prefix: string
): RuleEvalResult {
    // Step 1: Check required semantic roles
    const missingRoles = rule.requiredSemanticRoles.filter(
        role => !(role in semanticColumns) || !semanticColumns[role]
    );

    if (missingRoles.length > 0) {
        return {
            eligible: false,
            reason: `Missing required semantic roles: [${missingRoles.join(', ')}]`,
            missingRoles,
        };
    }

    // Step 2: Check join requirements
    if (rule.requiresJoin) {
        const joinedRoles = rule.joinedSemanticRoles ?? [];

        // All joined roles must also be in semanticColumns
        const missingJoinRoles = joinedRoles.filter(
            role => !(role in semanticColumns) || !semanticColumns[role]
        );
        if (missingJoinRoles.length > 0) {
            return {
                eligible: false,
                reason: `Missing joined semantic roles (required for cross-table KPI): [${missingJoinRoles.join(', ')}]`,
                missingRoles: missingJoinRoles,
            };
        }

        // There must be at least one valid relationship in the graph
        if (relationships.length === 0) {
            return {
                eligible: false,
                reason: 'KPI requires cross-table join but no relationships exist in the relationship graph',
                missingRoles: [],
            };
        }

        // At minimum one relationship must be present — KPI is relationship-gated
        const hasValidRelationship = relationships.some(rel =>
            rel.confidence > 0.5  // only trust relationships above 50% confidence
        );

        if (!hasValidRelationship) {
            return {
                eligible: false,
                reason: 'KPI requires cross-table join but no high-confidence relationship found (confidence > 0.5 required)',
                missingRoles: [],
            };
        }
    }

    // All checks passed
    return { eligible: true, reason: 'All required semantic roles present', missingRoles: [] };
}

// ─── Summary Helper ────────────────────────────────────────────────────────────

export function summarizeEligibility(result: EligibilityResult): void {
    console.log(`\n[Module4.5] === ELIGIBILITY SUMMARY for ${result.domain} ===`);
    console.log(`  Unlocked KPIs (${result.unlockedKPIs.length}):`);
    result.unlockedKPIs.forEach(k => console.log(`    ✅ [${k.id}] ${k.name}`));
    console.log(`  Skipped KPIs (${result.skippedKPIs.length}):`);
    result.skippedKPIs.forEach(s => console.log(`    ❌ [${s.rule.id}] ${s.rule.name} — ${s.reason}`));
    console.log(`[Module4.5] ===============================================\n`);
}
