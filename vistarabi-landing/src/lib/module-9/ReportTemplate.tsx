import React from 'react';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontFamily: 'Helvetica' },
  header: { fontSize: 24, marginBottom: 20, color: '#1e293b', fontWeight: 'bold' },
  sectionTitle: { fontSize: 16, marginTop: 20, marginBottom: 10, color: '#334155' },
  bodyText: { fontSize: 12, lineHeight: 1.5, color: '#475569' },
  metricsRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 20, padding: 15, backgroundColor: '#f8fafc' },
  metricBox: { flexDirection: 'column', alignItems: 'center' },
  metricValue: { fontSize: 20, fontWeight: 'bold', color: '#4f46e5' },
  metricLabel: { fontSize: 10, color: '#64748b', textTransform: 'uppercase' },
  chartImage: { width: '100%', marginTop: 20, borderRadius: 8 }
});

export interface ExecutiveReportProps {
  summaryText: string;
  metrics: {
    probability: number;
    reliability: number;
    gap: number;
  };
  chartImage: string;
}

export const ExecutiveReport = ({ summaryText, metrics, chartImage }: ExecutiveReportProps) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <Text style={styles.header}>VistaraBI Strategic Decision Report</Text>
      
      {/* Top Metrics */}
      <View style={styles.metricsRow}>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>{(metrics.probability * 100).toFixed(1)}%</Text>
          <Text style={styles.metricLabel}>Probability of Success</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricValue}>${metrics.gap.toLocaleString(undefined, {maximumFractionDigits: 0})}</Text>
          <Text style={styles.metricLabel}>Strategy Gap</Text>
        </View>
      </View>

      {/* AI Generated Narrative */}
      <Text style={styles.sectionTitle}>Executive Summary</Text>
      <Text style={styles.bodyText}>{summaryText}</Text>

      {/* Captured Chart */}
      <Text style={styles.sectionTitle}>Monte Carlo Simulation</Text>
      {chartImage && <Image src={chartImage} style={styles.chartImage} />}
      
    </Page>
  </Document>
);
