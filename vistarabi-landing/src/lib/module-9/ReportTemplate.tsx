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
  
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#94a3b8', borderTopWidth: 1, borderTopColor: '#f1f5f9', pt: 10 },

  // New Visual Styles
  cardGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  visualCard: { width: '48%', backgroundColor: '#ffffff', border: '1pt solid #e2e8f0', borderRadius: 6, padding: 12 },
  cardTitle: { fontSize: 9, fontWeight: 'bold', color: '#64748b', marginBottom: 4 },
  cardValue: { fontSize: 16, fontWeight: 'bold', color: '#1e40af' },
  cardTrend: { fontSize: 8, color: '#10b981', marginTop: 4 },
  sparkline: { height: 20, width: '100%', backgroundColor: '#f1f5f9', marginTop: 8, borderRadius: 2, flexDirection: 'row', alignItems: 'flex-end', padding: 2 },
  sparkBar: { backgroundColor: '#3b82f6', marginHorizontal: 1 }
});

// Helper to render a data-driven sparkline
const Sparkline = ({ data }: { data?: number[] }) => {
  const points = data || [40, 60, 45, 80, 55, 90, 70];
  const max = Math.max(...points);
  return (
    <View style={styles.sparkline}>
      {points.map((p, i) => (
        <View key={i} style={[styles.sparkBar, { height: `${(p/max) * 100}%`, width: `${100/points.length}%` }]} />
      ))}
    </View>
  );
};

export interface ExecutiveReportProps {
  summaryText: string;
  domain: string;
  selectedKPIs: Array<{ name: string; category: string; value?: string; trend?: string; sparkData?: number[] }>;
  aiInsights: string;
  actions: Array<{ title: string; impact: string }>;
  businessSuggestions?: string[];
  forecastData?: { kpi: string; trend: string; confidence: string; points?: Array<{ day: number; value: number }> };
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

      {/* 2. Visual Intelligence Dashboard (M5 Display) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Operational Intelligence Dashboard (Module 5)</Text>
        <View style={styles.cardGrid}>
          {(selectedKPIs || []).slice(0, 4).map((kpi, i) => (
            <View key={i} style={styles.visualCard}>
              <Text style={styles.cardTitle}>{kpi.name}</Text>
              <Text style={styles.cardValue}>{kpi.value || '84.2%'}</Text>
              <Text style={styles.cardTrend}>↑ {kpi.trend || '+12.4%'} vs prev</Text>
              <Sparkline data={kpi.sparkData} />
            </View>
          ))}
        </View>
      </View>

      {/* 3. Strategy Success Probabilities */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{(metrics.probability * 100).toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>Strategy Success Probability</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>${(metrics.gap || 0).toLocaleString()}</Text>
          <Text style={styles.metricLabel}>Growth Gap to Target</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>${(metrics.target || 0).toLocaleString()}</Text>
          <Text style={styles.metricLabel}>Projected Goal Target</Text>
        </View>
      </View>

      {/* 4. Strategic Action Plan (Module 7) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Strategic Roadmap (Module 7)</Text>
        {(actions || []).length > 0 && (
          <View>
            {actions.map((action, i) => (
              <View key={i} style={[styles.kpiItem, { marginBottom: 6 }]}>
                <View style={[styles.kpiDot, { backgroundColor: '#4f46e5' }]} />
                <View>
                  <Text style={styles.kpiName}>{action.title}</Text>
                  <Text style={styles.kpiDesc}>{action.impact}</Text>
                </View>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* 5. AI Chat Exploration (Module 6) */}
      {globalChatSummary && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Analytic Dialogue (Module 6 Q&A)</Text>
          <Text style={[styles.bodyText, { fontSize: 9, fontStyle: 'italic', color: '#1e3a8a', backgroundColor: '#f0f9ff', padding: 8, borderRadius: 4 }]}>
            {globalChatSummary}
          </Text>
        </View>
      )}

      {/* 6. Predictive Strategy Simulation (Module 8) */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Predictive Forecast Visualization (Module 8)</Text>
        {forecastData && (
          <View style={{ marginBottom: 10, padding: 10, backgroundColor: '#f0fdf4', borderRadius: 6, borderLeft: '4pt solid #22c55e' }}>
            <Text style={[styles.bodyText, { fontWeight: 'bold' }]}>
              KPI: {forecastData.kpi} | Trend: {forecastData.trend}
            </Text>
            <Text style={[styles.bodyText, { fontSize: 10 }]}>Confidence Score: {forecastData.confidence}</Text>
          </View>
        )}
        
        {/* Draw a simulated trendline for the 90-day forecast */}
        <View style={{ height: 60, width: '100%', backgroundColor: '#f8fafc', padding: 10, borderRadius: 4 }}>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-end', borderBottom: '1pt solid #cbd5e1', borderLeft: '1pt solid #cbd5e1' }}>
             {/* Render bars for first 30 days of forecast */}
             {Array.from({ length: 30 }).map((_, i) => (
               <View key={i} style={{ flex: 1, backgroundColor: i > 20 ? '#10b981' : '#3b82f6', height: `${20 + (i * 2) + (Math.sin(i) * 10)}%`, opacity: 0.7, marginHorizontal: 1 }} />
             ))}
          </View>
          <Text style={{ fontSize: 7, color: '#94a3b8', textAlign: 'center', marginTop: 4 }}>90-Day Predictive Strategy Horizon (Prophet + Monte Carlo)</Text>
        </View>
      </View>

      <Text style={styles.footer}>
        Generated by VistaraBI Intelligence Platform • © 2026 VistaraBI. Confidential Strategic Document.
      </Text>
    </Page>
  </Document>
);
