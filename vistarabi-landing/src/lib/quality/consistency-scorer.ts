// Consistency scorer - measures format uniformity

import { ColumnMeta, DataType } from '@/lib/prisma';

export interface ConsistencyResult {
    overallScore: number;  // 0-100
    columnScores: Map<string, number>;
}

export function calculateConsistency(
    data: Record<string, unknown>[],
    columnMeta: ColumnMeta[]
): ConsistencyResult {
    if (data.length === 0 || columnMeta.length === 0) {
        return { overallScore: 100, columnScores: new Map() };  // Empty = perfectly consistent
    }

    const columnScores = new Map<string, number>();
    const columnMetaMap = new Map(columnMeta.map(c => [c.originalName, c]));

    for (const [colName, meta] of columnMetaMap.entries()) {
        const values = data.map(row => row[colName]).filter(v => v !== null && v !== undefined && v !== '');

        if (values.length === 0) {
            columnScores.set(colName, 100);  // No values = consistent
            continue;
        }

        const consistentCount = values.filter(v => matchesExpectedType(v, meta.dataType)).length;
        const score = (consistentCount / values.length) * 100;
        columnScores.set(colName, score);
    }

    // Calculate overall as average
    const scores = Array.from(columnScores.values());
    const overallScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 100;

    return {
        overallScore: Math.round(overallScore * 100) / 100,
        columnScores,
    };
}

// Check if value matches expected data type
function matchesExpectedType(value: unknown, dataType: DataType): boolean {
    const strValue = String(value);

    switch (dataType) {
        case 'NUMBER':
            return !isNaN(Number(value)) && isFinite(Number(value));

        case 'DATE':
            // Check if matches ISO format YYYY-MM-DD or is valid date
            const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
            if (isoPattern.test(strValue)) return true;
            const date = new Date(strValue);
            return !isNaN(date.getTime());

        case 'BOOLEAN':
            const lower = strValue.toLowerCase();
            return ['true', 'false', '1', '0', 'yes', 'no'].includes(lower);

        case 'TEXT':
        default:
            return typeof value === 'string';
    }
}
