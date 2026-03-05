// Module 6E — Causation Guard
// Rejects model output that contains causal language.
// VistaraBI states correlation, NOT causation. This is non-negotiable.

import type { CausationGuardResult } from './types';

const CAUSAL_PATTERNS: { regex: RegExp; label: string }[] = [
    { regex: /\bcaused?\b/i, label: 'caused' },
    { regex: /\bcauses?\b/i, label: 'causes' },
    { regex: /\bdrives?\b/i, label: 'drives' },
    { regex: /\bdriven\s+by\b/i, label: 'driven by' },
    { regex: /\bleads?\s+to\b/i, label: 'leads to' },
    { regex: /\bled\s+to\b/i, label: 'led to' },
    { regex: /\bresults?\s+in\b/i, label: 'results in' },
    { regex: /\bresulted\s+in\b/i, label: 'resulted in' },
    { regex: /\bimpacts?\b/i, label: 'impacts' },
    { regex: /\beffect\s+on\b/i, label: 'effect on' },
    { regex: /\binfluences?\b/i, label: 'influences' },
    { regex: /\bdetermines?\b/i, label: 'determines' },
    { regex: /\btriggers?\b/i, label: 'triggers' },
];

/**
 * Check model output for causal language violations.
 *
 * Returns { passed: true } if text contains no causal verbs.
 * Returns { passed: false, violatingPhrase } on first violation found.
 */
export function checkCausation(text: string): CausationGuardResult {
    for (const { regex, label } of CAUSAL_PATTERNS) {
        if (regex.test(text)) {
            return { passed: false, violatingPhrase: label };
        }
    }
    return { passed: true };
}
