// Module 5A+5C — Dashboard Component Types

export interface KPICardData {
    kpiId: string;
    kpiName: string;
    formula: string;
    category: string;
    currentValue: number;
    previousValue?: number;
    trend?: 'up' | 'down' | 'flat';
    trendPercent?: number;
    chartType: string;
    chartLibrary: 'chartjs' | 'plotly';
    dataPoints: Array<{ label: string; value: number }>;
    colorAccent?: string;
    // Module 5C additions
    anomalySeverity?: 'normal' | 'warning' | 'critical';
    anomalyScore?: number;
    anomalyReason?: string;
    insightSummary?: string;
    trendSummary?: string;
    lineageExplanation?: string;
    changeAttribution?: string;
    lastUpdated?: string;
}

export interface KPIExplanationData {
    kpiId: string;
    explanation: string;
    formulaSummary: string;
    dataSourceRef: string;
    businessDefinition: string;
    recommendation?: string;
}

export interface DashboardSection {
    id: string;
    title: string;
    description: string;
    icon: string;
    kpiIds: string[];
}

// Module 5C — Insight Feed
export interface InsightFeedItem {
    id: string;
    type: 'movement' | 'anomaly' | 'trend' | 'freshness' | 'alert';
    kpiId: string;
    kpiName: string;
    title: string;
    description: string;
    severity: 'normal' | 'warning' | 'critical';
    value?: number;
    delta?: number;
    deltaPercent?: number;
    timestamp: string;
}

// Module 5C — Smart Alerts
export interface SmartAlert {
    kpiId: string;
    kpiName: string;
    severity: 'normal' | 'warning' | 'critical';
    triggeredAt: string;
    reason: string;
    delta: number;
    deltaPercent: number;
    acknowledged: boolean;
}
