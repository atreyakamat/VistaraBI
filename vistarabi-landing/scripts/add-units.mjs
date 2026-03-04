import { readFileSync, writeFileSync } from 'fs';

const filePath = 'src/lib/kpi/kpi-rule-registry.ts';
let content = readFileSync(filePath, 'utf8');

const unitMap = {
    'ec-001': 'currency', 'ec-002': 'count', 'ec-003': 'currency', 'ec-004': 'ratio', 'ec-005': 'ratio',
    'ec-006': 'currency', 'ec-007': 'ratio', 'ec-008': 'currency', 'ec-009': 'currency', 'ec-010': 'currency',
    'saas-001': 'currency', 'saas-002': 'currency', 'saas-003': 'ratio', 'saas-004': 'ratio', 'saas-005': 'currency',
    'saas-006': 'ratio', 'saas-007': 'count', 'saas-008': 'currency', 'saas-009': 'currency', 'saas-010': 'currency',
    'ed-001': 'count', 'ed-002': 'ratio', 'ed-003': 'score', 'ed-004': 'count', 'ed-005': 'ratio',
    'ed-006': 'currency', 'ed-007': 'ratio', 'ed-008': 'count', 'ed-009': 'currency', 'ed-010': 'count',
    'rt-001': 'currency', 'rt-002': 'ratio', 'rt-003': 'ratio', 'rt-004': 'currency', 'rt-005': 'count',
    'rt-006': 'ratio', 'rt-007': 'ratio', 'rt-008': 'currency', 'rt-009': 'ratio', 'rt-010': 'currency',
    'sv-001': 'currency', 'sv-002': 'ratio', 'sv-003': 'currency', 'sv-004': 'currency', 'sv-005': 'currency',
    'sv-006': 'count', 'sv-007': 'ratio', 'sv-008': 'count', 'sv-009': 'currency', 'sv-010': 'currency',
    'mf-001': 'count', 'mf-002': 'ratio', 'mf-003': 'ratio', 'mf-004': 'ratio', 'mf-005': 'hours',
    'mf-006': 'currency', 'mf-007': 'ratio', 'mf-008': 'ratio', 'mf-009': 'count', 'mf-010': 'days',
    'hc-001': 'count', 'hc-002': 'ratio', 'hc-003': 'ratio', 'hc-004': 'days', 'hc-005': 'ratio',
    'hc-006': 'ratio', 'hc-007': 'ratio', 'hc-008': 'currency', 'hc-009': 'ratio', 'hc-010': 'currency',
    'fn-001': 'count', 'fn-002': 'currency', 'fn-003': 'currency', 'fn-004': 'ratio', 'fn-005': 'ratio',
    'fn-006': 'ratio', 'fn-007': 'ratio', 'fn-008': 'ratio', 'fn-009': 'currency', 'fn-010': 'ratio',
};

// Normalize line endings to \n for processing, we'll restore CRLF at end
const hasCRLF = content.includes('\r\n');
content = content.replace(/\r\n/g, '\n');

// Split into lines, process each rule
const lines = content.split('\n');
const output = [];
let currentId = null;

for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Track current rule id
    const idMatch = line.match(/^\s+id:\s*'([^']+)'/);
    if (idMatch) {
        currentId = idMatch[1];
    }

    output.push(line);

    // After defaultVisualizationHint line WITHIN a rule block, inject unit
    if (currentId && unitMap[currentId] && line.match(/^\s+defaultVisualizationHint:/)) {
        // Check that the NEXT line does NOT already have unit
        const nextLine = lines[i + 1] || '';
        if (!nextLine.includes('unit:')) {
            const indent = line.match(/^(\s+)/)?.[1] || '        ';
            output.push(`${indent}unit: '${unitMap[currentId]}', // R3`);
        }
    }
}

let result = output.join('\n');
if (hasCRLF) result = result.replace(/\n/g, '\r\n');

writeFileSync(filePath, result, 'utf8');

// Verify
const check = result.indexOf("unit: '");
const count = (result.match(/unit: '/g) || []).length;
console.log(`unit field present: ${check >= 0}`);
console.log(`Total unit fields added: ${count} (expected: 80)`);
