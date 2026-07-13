// src/lib/kpi/domain-metadata.ts
// Complete KPI metadata for all 8 business domains.
// ⚠️  All KPI names match EXACTLY what is defined in kpi-library.ts
//     and all map to real columns in test-datasets/[domain]/*.csv
// Powers intelligent AI defaults (time granularity, aggregation, trend windows,
// forecastability) when the user doesn't specify those in natural language queries.

import type { DomainType } from '@/lib/prisma';

export type TimeGranularity = 'daily' | 'weekly' | 'monthly' | 'quarterly' | 'yearly';
export type AggregationFn = 'sum' | 'avg' | 'count' | 'max' | 'min';

export interface KPIMetadata {
    id: string;
    unit: string;
    aggregationFn: AggregationFn;
    defaultGranularity: TimeGranularity;
    defaultTrendWindowMonths: number;
    domainCategory: string;
    isContinuous?: boolean;
    forecastable?: boolean;
    sourceColumn?: string; // actual CSV column this maps to
}

// ─── E-COMMERCE ─────────────────────────────────────────────────────────────────

const ECOMMERCE_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Revenue':                  { id: 'Total Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Average Order Value':            { id: 'Average Order Value', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Revenue per Segment':            { id: 'Revenue per Segment', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: false, forecastable: false, sourceColumn: 'metric_5_financial' },
    'Revenue by Channel':             { id: 'Revenue by Channel', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: false, forecastable: false, sourceColumn: 'metric_5_financial' },
    'Conversion Rate':                { id: 'Conversion Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Conversion', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Average Conversion Rate (metric_3)': { id: 'Average Conversion Rate (metric_3)', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Conversion', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Cart Abandonment Rate':          { id: 'Cart Abandonment Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Conversion', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'System Latency (P50)':           { id: 'System Latency (P50)', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Peak Checkout Latency':          { id: 'Peak Checkout Latency', unit: 'ms', aggregationFn: 'max', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Success Rate':                   { id: 'Success Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'status' },
    'Active Entities (Daily)':        { id: 'Active Entities (Daily)', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Customer', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'Customer Segment Distribution':  { id: 'Customer Segment Distribution', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 3, domainCategory: 'Customer', isContinuous: false, forecastable: false, sourceColumn: 'entity_segment' },
    'Revenue per Region':             { id: 'Revenue per Region', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Customer', isContinuous: false, forecastable: false, sourceColumn: 'entity_region' },
    'Promo Redemption Rate':          { id: 'Promo Redemption Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Marketing', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Wishlist to Purchase Rate':      { id: 'Wishlist to Purchase Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Marketing', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Return Request Rate':            { id: 'Return Request Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Support Interaction Rate':       { id: 'Support Interaction Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Warehouse Temperature Avg':      { id: 'Warehouse Temperature Avg', unit: 'celsius', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Revenue Trend Over Time':        { id: 'Revenue Trend Over Time', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Event Volume Trend':             { id: 'Event Volume Trend', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'record_id' },
};

// ─── EDTECH ─────────────────────────────────────────────────────────────────────

const EDTECH_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Active Learners':          { id: 'Total Active Learners', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'Course Completion Rate':         { id: 'Course Completion Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Average Lesson Progress':        { id: 'Average Lesson Progress', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Average Video Duration Watched': { id: 'Average Video Duration Watched', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Quiz Pass Rate':                 { id: 'Quiz Pass Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Average Quiz Score':             { id: 'Average Quiz Score', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Revenue per Session':            { id: 'Revenue per Session', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Total Platform Revenue':         { id: 'Total Platform Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Platform Latency (P50)':         { id: 'Platform Latency (P50)', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Dropout Rate':                   { id: 'Dropout Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Retention', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Assignment Submission Rate':     { id: 'Assignment Submission Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Forum Engagement Rate':          { id: 'Forum Engagement Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'weekly', defaultTrendWindowMonths: 3, domainCategory: 'Engagement', isContinuous: true, forecastable: false, sourceColumn: 'event_style' },
    'Support Ticket Rate':            { id: 'Support Ticket Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Daily Active Learners Trend':    { id: 'Daily Active Learners Trend', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'Revenue Growth Trend':           { id: 'Revenue Growth Trend', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
};

// ─── RETAIL ─────────────────────────────────────────────────────────────────────

const RETAIL_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Basket Value':             { id: 'Total Basket Value', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Average Basket Value':           { id: 'Average Basket Value', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Gross Margin':                   { id: 'Gross Margin', unit: 'currency', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Profitability', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Sell-Through Rate':              { id: 'Sell-Through Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Checkout Time (Avg)':            { id: 'Checkout Time (Avg)', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Footfall Density':               { id: 'Footfall Density', unit: 'index', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Footfall Conversion Rate':       { id: 'Footfall Conversion Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Conversion', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Return Rate':                    { id: 'Return Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Loyalty Scan Rate':              { id: 'Loyalty Scan Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Marketing', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Active Shoppers per Day':        { id: 'Active Shoppers per Day', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Customer', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'Revenue by Region':              { id: 'Revenue by Region', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: false, forecastable: false, sourceColumn: 'entity_region' },
    'Revenue Trend (Daily)':          { id: 'Revenue Trend (Daily)', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Restock Frequency':              { id: 'Restock Frequency', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Pickup Order Rate':              { id: 'Pickup Order Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Premium Segment Revenue Share':  { id: 'Premium Segment Revenue Share', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Customer', isContinuous: false, forecastable: false, sourceColumn: 'entity_segment' },
};

// ─── SAAS ─────────────────────────────────────────────────────────────────────

const SAAS_KPI_METADATA: Record<string, KPIMetadata> = {
    'Monthly Recurring Revenue':      { id: 'Monthly Recurring Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 24, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'MRR Trend (Daily)':              { id: 'MRR Trend (Daily)', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Net Retention Rate':             { id: 'Net Retention Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Retention', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Churn Rate':                     { id: 'Churn Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Retention', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Active Users (DAU)':             { id: 'Active Users (DAU)', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'API Latency (P50)':              { id: 'API Latency (P50)', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'API Latency (P99)':              { id: 'API Latency (P99)', unit: 'ms', aggregationFn: 'max', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'CPU Utilization':                { id: 'CPU Utilization', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Feature Adoption Rate':          { id: 'Feature Adoption Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Upgrade Rate':                   { id: 'Upgrade Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Support Ticket Rate':            { id: 'Support Ticket Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Session Usage Depth':            { id: 'Session Usage Depth', unit: 'count', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Revenue by Segment':             { id: 'Revenue by Segment', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: false, forecastable: false, sourceColumn: 'entity_segment' },
    'System Uptime Proxy':            { id: 'System Uptime Proxy', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'status' },
    'DAU/MAU Ratio':                  { id: 'DAU/MAU Ratio', unit: 'ratio', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Engagement', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
};

// ─── FINANCE ─────────────────────────────────────────────────────────────────────

const FINANCE_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Transaction Volume':       { id: 'Total Transaction Volume', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Transaction Count Trend':        { id: 'Transaction Count Trend', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'record_id' },
    'Net Revenue':                    { id: 'Net Revenue', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Average Processing Time':        { id: 'Average Processing Time', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Transaction Approval Rate':      { id: 'Transaction Approval Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Average Risk Score':             { id: 'Average Risk Score', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Risk', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Transfer Volume Trend':          { id: 'Transfer Volume Trend', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Loan Application Rate':          { id: 'Loan Application Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'ATM Withdrawal Rate':            { id: 'ATM Withdrawal Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Trade Execution Rate':           { id: 'Trade Execution Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Net Revenue Trend':              { id: 'Net Revenue Trend', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Revenue by Channel':             { id: 'Revenue by Channel', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: false, forecastable: false, sourceColumn: 'event_channel' },
    'Active Users Daily':             { id: 'Active Users Daily', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Customer', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'High-Risk Transaction Ratio':    { id: 'High-Risk Transaction Ratio', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Risk', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Support Call Rate':              { id: 'Support Call Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
};

// ─── HEALTHCARE ─────────────────────────────────────────────────────────────────

const HEALTHCARE_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Patients Served':          { id: 'Total Patients Served', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'Average Vitals Score':           { id: 'Average Vitals Score', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Average Wait Time':              { id: 'Average Wait Time', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Treatment Success Rate':         { id: 'Treatment Success Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Average Patient Temperature':    { id: 'Average Patient Temperature', unit: 'celsius', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Clinical', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Total Claims Value':             { id: 'Total Claims Value', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Appointment Booking Rate':       { id: 'Appointment Booking Rate', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Prescription Rate':              { id: 'Prescription Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Clinical', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Discharge Rate':                 { id: 'Discharge Rate', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Lab Test Volume':                { id: 'Lab Test Volume', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Follow-up Compliance Rate':      { id: 'Follow-up Compliance Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Claims Trend':                   { id: 'Claims Trend', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Regional Patient Distribution':  { id: 'Regional Patient Distribution', unit: 'count', aggregationFn: 'count', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Volume', isContinuous: false, forecastable: false, sourceColumn: 'entity_region' },
    'Pharmacy Dispense Rate':         { id: 'Pharmacy Dispense Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Max Wait Time Trend':            { id: 'Max Wait Time Trend', unit: 'ms', aggregationFn: 'max', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
};

// ─── MANUFACTURING ─────────────────────────────────────────────────────────────────

const MANUFACTURING_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Units Produced':           { id: 'Total Units Produced', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Production Output Trend':        { id: 'Production Output Trend', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Average Yield Rate':             { id: 'Average Yield Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Average Cycle Time':             { id: 'Average Cycle Time', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'Machine Temperature':            { id: 'Machine Temperature', unit: 'celsius', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Production Cost Trend':          { id: 'Production Cost Trend', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Cost', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Defect Rate':                    { id: 'Defect Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Maintenance Request Rate':       { id: 'Maintenance Request Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'OEE Proxy (Yield × Throughput)': { id: 'OEE Proxy (Yield × Throughput)', unit: 'index', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'Batch Completion Rate':          { id: 'Batch Completion Rate', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Volume', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Shift Efficiency':               { id: 'Shift Efficiency', unit: 'count', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Inventory Pull Frequency':       { id: 'Inventory Pull Frequency', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Machine Utilization Rate':       { id: 'Machine Utilization Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'QA Check Pass Rate':             { id: 'QA Check Pass Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Peak Cycle Time':                { id: 'Peak Cycle Time', unit: 'ms', aggregationFn: 'max', defaultGranularity: 'daily', defaultTrendWindowMonths: 1, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
};

// ─── SERVICES ─────────────────────────────────────────────────────────────────────

const SERVICES_KPI_METADATA: Record<string, KPIMetadata> = {
    'Total Invoice Value':            { id: 'Total Invoice Value', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Revenue Trend (Daily)':          { id: 'Revenue Trend (Daily)', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'metric_5_financial' },
    'Total Billable Hours':           { id: 'Total Billable Hours', unit: 'hours', aggregationFn: 'sum', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Average Response Time':          { id: 'Average Response Time', unit: 'ms', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_2_time_ms' },
    'SLA Compliance Rate':            { id: 'SLA Compliance Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'metric_3_rate' },
    'CSAT Score':                     { id: 'CSAT Score', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'CSAT Trend':                     { id: 'CSAT Trend', unit: 'score', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 12, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'metric_4_physical' },
    'Issue Resolution Rate':          { id: 'Issue Resolution Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Operations', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Milestone Achievement Rate':     { id: 'Milestone Achievement Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Performance', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Payment Receipt Rate':           { id: 'Payment Receipt Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Revenue', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Client Onboarding Rate':         { id: 'Client Onboarding Rate', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Growth', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Utilization Rate':               { id: 'Utilization Rate', unit: 'percentage', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Efficiency', isContinuous: true, forecastable: true, sourceColumn: 'metric_1_value' },
    'Feedback Response Rate':         { id: 'Feedback Response Rate', unit: 'ratio', aggregationFn: 'avg', defaultGranularity: 'daily', defaultTrendWindowMonths: 3, domainCategory: 'Quality', isContinuous: true, forecastable: true, sourceColumn: 'event_style' },
    'Active Client Count':            { id: 'Active Client Count', unit: 'count', aggregationFn: 'count', defaultGranularity: 'daily', defaultTrendWindowMonths: 6, domainCategory: 'Customer', isContinuous: true, forecastable: true, sourceColumn: 'entity_id' },
    'Revenue by Channel':             { id: 'Revenue by Channel', unit: 'currency', aggregationFn: 'sum', defaultGranularity: 'monthly', defaultTrendWindowMonths: 6, domainCategory: 'Revenue', isContinuous: false, forecastable: false, sourceColumn: 'event_channel' },
};

// ─── Domain Metadata Map ──────────────────────────────────────────────────────────

export const DOMAIN_KPI_METADATA: Record<DomainType, Record<string, KPIMetadata>> = {
    ECOMMERCE:     ECOMMERCE_KPI_METADATA,
    EDTECH:        EDTECH_KPI_METADATA,
    RETAIL:        RETAIL_KPI_METADATA,
    SAAS:          SAAS_KPI_METADATA,
    FINANCE:       FINANCE_KPI_METADATA,
    HEALTHCARE:    HEALTHCARE_KPI_METADATA,
    MANUFACTURING: MANUFACTURING_KPI_METADATA,
    SERVICES:      SERVICES_KPI_METADATA,
};

export function getKPIMetadata(domain: DomainType, kpiName: string): KPIMetadata | undefined {
    return DOMAIN_KPI_METADATA[domain]?.[kpiName];
}

export function getContinuousKPIMetadata(domain: DomainType): KPIMetadata[] {
    return Object.values(DOMAIN_KPI_METADATA[domain] || {}).filter(k => k.isContinuous);
}

export function getForecastableKPIMetadata(domain: DomainType): KPIMetadata[] {
    return Object.values(DOMAIN_KPI_METADATA[domain] || {}).filter(k => k.forecastable);
}

export function getDefaultKPIMetadata(domain: DomainType, kpiName: string): KPIMetadata {
    return getKPIMetadata(domain, kpiName) ?? {
        id: kpiName,
        unit: 'count',
        aggregationFn: 'sum',
        defaultGranularity: 'daily',
        defaultTrendWindowMonths: 12,
        domainCategory: 'General',
        isContinuous: true,
        forecastable: true,
        sourceColumn: 'metric_1_value',
    };
}

// ─── Backward-Compatible Aliases ────────────────────────────────────────────────

/** @deprecated Use Object.keys(DOMAIN_KPI_METADATA[domain]) instead */
export function getDomainKPINames(domain: DomainType): string[] {
    return Object.keys(DOMAIN_KPI_METADATA[domain] || {});
}

