import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image, Font } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff' },
  header: { fontSize: 24, marginBottom: 20, color: '#1e3a8a', fontWeight: 'bold' },
  section: { marginBottom: 15, padding: 10, borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', marginBottom: 8, color: '#334155', textTransform: 'uppercase' },
  subTitle: { fontSize: 10, color: '#64748b', marginBottom: 4, textTransform: 'uppercase' },
  bodyText: { fontSize: 11, lineHeight: 1.6, color: '#475569' },
  highlightText: { fontSize: 12, fontWeight: 'bold', color: '#2563eb' },
  
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 15, padding: 15, backgroundColor: '#f8fafc', borderRadius: 8 },
  metricBox: { flex: 1, alignItems: 'center' },
  metricValue: { fontSize: 18, fontWeight: 'bold', color: '#1e40af' },
  metricLabel: { fontSize: 8, color: '#64748b', marginTop: 4, textAlign: 'center' },
  
  kpiList: { marginTop: 5 },
  kpiItem: { flexDirection: 'row', marginBottom: 4, alignItems: 'center' },
  kpiDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#2563eb', marginRight: 8 },
  kpiName: { fontSize: 10, fontWeight: 'bold', color: '#1e293b' },
  kpiDesc: { fontSize: 9, color: '#64748b', marginLeft: 12 },

  chartContainer: { marginVertical: 15, alignItems: 'center' },
  chartImage: { width: '100%', borderRadius: 8, border: '1pt solid #e2e8f0' },
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#f1f5f9', pt: 10 }
});

export interface ExecutiveReportProps {
  summaryText: string;
  domain: string;
  selectedKPIs: Array<{ name: string; category: string }>;
  aiInsights: string;
  actions: Array<{ title: string; impact: string }>;
  businessSuggestions?: string[];
  forecastData?: { kpi: string; trend: string; confidence: string };
  metrics: {
    probability: number;
    gap: number;
    baseline?: number;
    target?: number;
  };
  chartImage: string;
  dashboardImage?: string | null;
  globalChatSummary?: string;
}

export const ExecutiveReport = ({ 
  summaryText, 
  domain, 
  selectedKPIs, 
  aiInsights, 
  actions, 
  businessSuggestions,
  forecastData,
  metrics, 
  chartImage,
  dashboardImage,
  globalChatSummary
}: ExecutiveReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>VistaraBI Strategic Intelligence Report</Text>
      
      {/* 1. Executive Summary & Domain */}
      <View style={styles.section}>
        <Text style={styles.subTitle}>Business Domain: {domain}</Text>
        <Text style={styles.sectionTitle}>Executive Summary</Text>
        <Text style={styles.bodyText}>{summaryText}</Text>
      </View>

      {/* 2. Key Metrics Summary */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{(metrics.probability * 100).toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>Strategy Success Probability</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>${(metrics.gap || 0).toLocaleString()}</Text>
          <Text style={styles.metricLabel}>Growth Gap to Target</Text>
        </View>
        {metrics.target && (
          <View style={styles.metricBox}>
            <Text style={styles.metricValue}>${metrics.target.toLocaleString()}</Text>
            <Text style={styles.metricLabel}>Projected Goal Target</Text>
          </View>
        )}
      </View>

      {/* 3. Selected KPIs */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategic Measurement Blueprint</Text>
        <View style={styles.kpiList}>
          {(selectedKPIs || []).map((kpi, i) => (
            <View key={i} style={styles.kpiItem}>
              <View style={styles.kpiDot} />
              <Text style={styles.kpiName}>{kpi.name} ({kpi.category})</Text>
            </View>
          ))}
        </View>
      </View>

      {/* 4. Dashboard Visuals */}
      {dashboardImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dashboard Performance Monitors</Text>
          <View style={styles.chartContainer}>
            <Image src={dashboardImage} style={styles.chartImage} />
            <Text style={[styles.metricLabel, { marginTop: 8 }]}>Current Key Performance Indicators View</Text>
          </View>
        </View>
      )}

      {/* 5. Business Suggestions Section */}
      {businessSuggestions && businessSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Board-Level Business Suggestions</Text>
          <View style={{ marginTop: 5 }}>
            {businessSuggestions.map((suggestion, i) => (
              <View key={i} style={styles.kpiItem}>
                <View style={[styles.kpiDot, { backgroundColor: '#10b981' }]} />
                <Text style={styles.bodyText}>{suggestion}</Text>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* 6. AI Chat Exploration (Ask AI) */}
      {globalChatSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Global Data Exploration (Module 6)</Text>
          <Text style={styles.bodyText}>{globalChatSummary}</Text>
        </View>
      )}

      {/* 6. AI Strategic Insights (Module 7 & 8 Actions) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Strategic Insights (Module 6 & 7)</Text>
        <Text style={styles.bodyText}>{aiInsights}</Text>
        {(actions || []).length > 0 && (
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.subTitle, { color: '#1e40af' }]}>Recommended Actions:</Text>
            {actions.map((action, i) => (
              <Text key={i} style={[styles.bodyText, { fontSize: 10, marginLeft: 10 }]}>• {action.title}: {action.impact}</Text>
            ))}
          </View>
        )}
      </View>

      {/* 5. Forecast & Visualization */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Predictive Analysis (Module 8)</Text>
        {forecastData && (
          <Text style={[styles.bodyText, { marginBottom: 10 }]}>
            Forecasting <Text style={styles.highlightText}>{forecastData.kpi}</Text>: {forecastData.trend}. 
            Confidence level is <Text style={styles.highlightText}>{forecastData.confidence}</Text>.
          </Text>
        )}
        <View style={styles.chartContainer}>
          {chartImage && <Image src={chartImage} style={styles.chartImage} />}
          <Text style={[styles.metricLabel, { marginTop: 8 }]}>Monte Carlo Simulation & Predictive Trendline</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Generated by VistaraBI Intelligence Platform • © 2026 VistaraBI. Confidential.
      </Text>
    </Page>
  </Document>
);
