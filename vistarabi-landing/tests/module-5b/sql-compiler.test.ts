import { describe, expect, it } from 'vitest';

import { compileFullQuery, type CompilationContext } from '../../src/lib/execution/sql-compiler';

describe('Module 5B — SQL compiler', () => {
    it('uses identical DATE_TRUNC expressions in SELECT and GROUP BY for time series queries', () => {
        const ctx: CompilationContext = {
            kpi: {
                id: 'kpi-1',
                kpiLibraryId: 'kpi-1',
                name: 'Revenue',
                category: 'revenue',
                sourceTable: 'merged_data_project_1',
                aggregations: [{ function: 'SUM', column: 'amount' }],
                groupBys: [],
                lineage: { formula: 'SUM(amount)', tables: ['merged_data_project_1'], joins: [] },
            } as any,
            filters: {
                dateColumn: 'order_date',
            },
            granularity: 'monthly',
        };

        const compiled = compileFullQuery(ctx);
        const expectedExpr = `DATE_TRUNC('month'::TEXT, "order_date"::DATE)::DATE`;

        expect(compiled.text).toContain(`${expectedExpr} AS "period"`);
        expect(compiled.text).toContain(`GROUP BY ${expectedExpr}`);
        expect(compiled.text).not.toContain('"order_date"::TIMESTAMP');
    });
});
