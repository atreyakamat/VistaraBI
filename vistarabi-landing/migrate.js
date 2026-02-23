const fs = require('fs');
let content = fs.readFileSync('src/lib/kpi/kpi-library.ts', 'utf8');

content = content.replace(/export interface KPIDefinition \{[\s\S]*?\}/, `export interface KPIDefinition {
    id: string;
    name: string;
    domain: DomainType;
    description: string;
    requiredFields: string[];
    formulaTemplate: string;
    aggregationRules: { function: string; column: string }[];
    defaultVisualizationHint: string;
    columnAliases: Record<string, string[]>;
    category: string;
    priority: number;
}`);

const newLines = content.split('\n').map(line => {
    if (line.includes("{ id: '")) {
        let inner = line.substring(line.indexOf('{') + 1, line.lastIndexOf('}'));
        let prefix = line.substring(0, line.indexOf('{') + 1);
        let suffix = line.substring(line.lastIndexOf('}'));

        inner = inner.replace(/requiredColumns:/, 'requiredFields:');
        inner = inner.replace(/formula: '([^']+)'/, "formulaTemplate: '$1'");

        const formulaMatch = inner.match(/formulaTemplate: '([^']+)'/);
        if (formulaMatch) {
            let formula = formulaMatch[1];
            let aggRules = [];
            let regex = /(SUM|COUNT|AVG|MIN|MAX)\((?:DISTINCT )?([a-zA-Z0-9_]+)\)/g;
            let m;
            while ((m = regex.exec(formula)) !== null) {
                let func = m[1];
                let col = m[2];
                if (formula.includes(`COUNT(DISTINCT ${col})`) || formula.includes(`COUNT_DISTINCT(${col})`)) {
                    func = 'COUNT_DISTINCT';
                }
                const rule = `{ function: '${func}', column: '${col}' }`;
                if (!aggRules.includes(rule)) {
                    aggRules.push(rule);
                }
            }

            let hint = 'metric_card';
            if (formula.includes('GROUP BY') || inner.includes("category: 'volume'")) hint = 'bar_chart';
            if (inner.includes("growth")) hint = 'line_chart';

            inner = inner.replace(/formulaTemplate: '([^']+)'/, `formulaTemplate: '$1', aggregationRules: [${aggRules.join(', ')}], defaultVisualizationHint: '${hint}'`);
        }
        return prefix + inner + suffix;
    }
    return line;
});

fs.writeFileSync('src/lib/kpi/kpi-library.ts', newLines.join('\n'));
console.log('Fixed Migration complete!');
