// Module 7: Goal Parser
// Takes raw natural language and extracts metric, target, and timeframe

export interface ParsedGoal {
    targetMetric: string;
    targetValue: string;
    timeframe: string;
    kpiId?: string;
}

export async function parseGoal(rawQuery: string): Promise<ParsedGoal> {
    // TODO: Implement regex and Ollama-based parsing
    // Stub implementation
    return {
        targetMetric: 'revenue',
        targetValue: '+20%',
        timeframe: 'this quarter'
    };
}
