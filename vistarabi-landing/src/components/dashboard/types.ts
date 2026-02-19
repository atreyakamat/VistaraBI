// Module 5A — Dashboard Component Types

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
