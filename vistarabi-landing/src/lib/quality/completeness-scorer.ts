// Completeness scorer - calculates % of non-null values

export interface CompletenessResult {
    overallScore: number;  // 0-100
    columnScores: Map<string, number>;
}

export function calculateCompleteness(
    data: Record<string, unknown>[]
): CompletenessResult {
    if (data.length === 0) {
        return { overallScore: 0, columnScores: new Map() };
    }

    const columns = Object.keys(data[0]);
    const columnScores = new Map<string, number>();

    for (const col of columns) {
        const nonNullCount = data.filter(row => {
            const value = row[col];
            return value !== null && value !== undefined && value !== '';
        }).length;

        const score = (nonNullCount / data.length) * 100;
        columnScores.set(col, score);
    }

    // Calculate overall as average of column scores
    const scores = Array.from(columnScores.values());
    const overallScore = scores.length > 0
        ? scores.reduce((sum, score) => sum + score, 0) / scores.length
        : 0;

    return {
        overallScore: Math.round(overallScore * 100) / 100, // Round to 2 decimals
        columnScores,
    };
}
