// Module 7: Goal Parser
// Takes raw natural language and extracts metric, target, and timeframe

export interface ParsedGoal {
    targetMetric: string;
    targetValue: string;
    timeframe: string;
    kpiId?: string;
    changeDirection: 'increase' | 'decrease' | 'maintain';
    changePercent?: number; // Numeric percentage change (e.g., 20 for "20%")
}

// Comprehensive keyword-to-KPI mapping across domains
const METRIC_MAP = [
    // E-Commerce
    { id: 'ec-001', metric: 'revenue', keywords: ['revenue', 'sales', 'income', 'earnings'] },
    { id: 'ec-002', metric: 'orders', keywords: ['orders', 'transactions', 'purchases'] },
    { id: 'ec-003', metric: 'average order value', keywords: ['aov', 'average order value', 'basket size', 'cart value'] },
    { id: 'ec-004', metric: 'conversion rate', keywords: ['conversion', 'convert', 'conversion rate'] },
    // SaaS
    { id: 'saas-001', metric: 'mrr', keywords: ['mrr', 'monthly recurring revenue', 'recurring revenue', 'arr', 'annual recurring revenue'] },
    { id: 'saas-002', metric: 'ltv', keywords: ['ltv', 'lifetime value', 'customer lifetime value', 'clv'] },
    { id: 'saas-003', metric: 'churn', keywords: ['churn', 'attrition', 'cancellation', 'churn rate'] },
    { id: 'saas-004', metric: 'retention', keywords: ['retention', 'retain', 'renewal rate', 'renewal'] },
    { id: 'saas-005', metric: 'nrr', keywords: ['nrr', 'net revenue retention', 'net retention'] },
    // Retail
    { id: 'rt-001', metric: 'store sales', keywords: ['store sales', 'store revenue', 'retail sales'] },
    { id: 'rt-002', metric: 'footfall', keywords: ['footfall', 'foot traffic', 'walk-ins', 'visitors'] },
    // Finance
    { id: 'fin-001', metric: 'profit margin', keywords: ['profit margin', 'margin', 'net margin', 'profitability'] },
    { id: 'fin-002', metric: 'cac', keywords: ['cac', 'customer acquisition cost', 'acquisition cost'] },
    // Generic
    { id: 'gen-001', metric: 'customer count', keywords: ['customers', 'users', 'subscribers', 'accounts'] },
    { id: 'gen-002', metric: 'nps', keywords: ['nps', 'net promoter score', 'customer satisfaction', 'csat'] },
];

const TIMEFRAME_PATTERNS = [
    /next\s+month/i,
    /this\s+month/i,
    /next\s+quarter/i,
    /this\s+quarter/i,
    /next\s+year/i,
    /this\s+year/i,
    /end\s+of\s+year/i,
    /\d+\s*days?/i,
    /\d+\s*weeks?/i,
    /\d+\s*months?/i,
    /q[1-4]/i,
    /fy\s*\d+/i,
];

const DECREASE_KEYWORDS = ['reduce', 'decrease', 'lower', 'cut', 'minimize', 'reduce', 'drop', 'decrease'];
const INCREASE_KEYWORDS = ['increase', 'grow', 'boost', 'improve', 'raise', 'maximize', 'scale', 'expand', 'double'];

/**
 * Parses natural language goals into structured objects.
 * Uses regex patterns for deterministic extraction.
 */
export async function parseGoal(rawQuery: string): Promise<ParsedGoal> {
    const query = rawQuery.toLowerCase();

    // 1. Detect change direction
    const changeDirection = DECREASE_KEYWORDS.some(k => query.includes(k))
        ? 'decrease'
        : INCREASE_KEYWORDS.some(k => query.includes(k))
            ? 'increase'
            : 'maintain';

    // 2. Metric Extraction
    let targetMetric = 'unknown';
    let kpiId: string | undefined;

    for (const entry of METRIC_MAP) {
        if (entry.keywords.some(k => query.includes(k))) {
            targetMetric = entry.metric;
            kpiId = entry.id;
            break;
        }
    }

    // 3. Target Value Extraction (percentage, dollar amount, or multiplier)
    const targetMatch = query.match(/(\d+(?:\.\d+)?%|\$\d+(?:k|m|b)?|\d+\s?[km]|\d+x)/i);
    const targetValue = targetMatch ? targetMatch[0] : 'unknown';

    // 4. Parse numeric change percent from target value
    let changePercent: number | undefined;
    const percentMatch = targetValue.match(/(\d+(?:\.\d+)?)\s*%/);
    if (percentMatch) {
        changePercent = parseFloat(percentMatch[1]);
    }

    // 5. Timeframe Extraction
    let timeframe = 'not specified';
    for (const pattern of TIMEFRAME_PATTERNS) {
        const match = rawQuery.match(pattern);
        if (match) {
            timeframe = match[0].toLowerCase().trim();
            break;
        }
    }

    return {
        targetMetric,
        targetValue,
        timeframe,
        kpiId,
        changeDirection,
        changePercent,
    };
}
