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
  uploadedDatasets?: Array<{ fileName: string; status: string; columns: number }>;
  cleaningSummary?: string;
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
  globalChatSummary,
  uploadedDatasets,
  cleaningSummary
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

      {/* 2. Data Ingestion & Quality Summary */}
      {uploadedDatasets && uploadedDatasets.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Data Ingestion & Integrity</Text>
          <View style={{ marginBottom: 8 }}>
            <Text style={styles.subTitle}>Uploaded Datasets:</Text>
            {uploadedDatasets.map((ds, i) => (
              <Text key={i} style={[styles.bodyText, { fontSize: 10 }]}>
                • {ds.fileName}: {ds.columns} columns detected. Status: {ds.status}
              </Text>
            ))}
          </View>
          {cleaningSummary && (
            <View>
              <Text style={styles.subTitle}>Purification & Quality Summary:</Text>
              <Text style={[styles.bodyText, { fontSize: 10 }]}>{cleaningSummary}</Text>
            </View>
          )}
        </View>
      )}

      {/* 3. Key Metrics Summary */}
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

      {/* 4. Selected KPIs */}
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

      {/* 5. Dashboard Visuals */}
      {dashboardImage && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Dashboard Performance Monitors</Text>
          <View style={styles.chartContainer}>
            <Image src={dashboardImage} style={styles.chartImage} />
            <Text style={[styles.metricLabel, { marginTop: 8 }]}>Current Key Performance Indicators View</Text>
          </View>
        </View>
      )}

      {/* 6. Strategic Planning (Module 7) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategic Action Plan (Module 7)</Text>
        <Text style={[styles.bodyText, { marginBottom: 8 }]}>
          Based on user objectives and AI-driven growth modeling, the following strategic actions have been prioritized:
        </Text>
        {(actions || []).length > 0 && (
          <View>
            {actions.map((action, i) => (
              <View key={i} style={[styles.kpiItem, { marginBottom: 6 }]}>
                <View style={[styles.kpiDot, { backgroundColor: '#4f46e5' }]} />
                <View>
                  <Text style={styles.kpiName}>{action.title}</Text>
                  <Text style={styles.kpiDesc}>Expected Impact: {action.impact}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 7. AI Chat Exploration (Module 6) */}
      {globalChatSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Exploratory Analysis (Module 6 Chat)</Text>
          <Text style={[styles.bodyText, { fontSize: 10, fontStyle: 'italic' }]}>{globalChatSummary}</Text>
        </View>
      )}

      {/* 8. AI Strategic Insights (Contextual Reasoning) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>AI Strategic Reasoning</Text>
        <Text style={styles.bodyText}>{aiInsights}</Text>
      </View>

      {/* 9. Business Suggestions Section */}
      {businessSuggestions && businessSuggestions.length > 0 && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Board-Level Recommendations</Text>
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

      {/* 10. Forecast & Visualization (Module 8) */}
      <View style={styles.section} break>
        <Text style={styles.sectionTitle}>Predictive Strategy Simulation (Module 8)</Text>
        {forecastData && (
          <View style={{ marginBottom: 15, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 6 }}>
            <Text style={[styles.bodyText, { fontWeight: 'bold' }]}>
              Target Metric: <Text style={styles.highlightText}>{forecastData.kpi}</Text>
            </Text>
            <Text style={styles.bodyText}>
              Projected Trajectory: {forecastData.trend}
            </Text>
            <Text style={styles.bodyText}>
              Statistical Confidence: <Text style={{ color: '#059669', fontWeight: 'bold' }}>{forecastData.confidence}</Text>
            </Text>
          </View>
        )}
        <View style={styles.chartContainer}>
          {chartImage && <Image src={chartImage} style={styles.chartImage} />}
          <Text style={[styles.metricLabel, { marginTop: 8 }]}>Monte Carlo Probability Cloud & Prophet Forecast Trendline</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Generated by VistaraBI Intelligence Platform • © 2026 VistaraBI. Confidential Strategic Document.
      </Text>
    </Page>
  </Document>
);
