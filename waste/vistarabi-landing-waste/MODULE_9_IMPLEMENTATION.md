# 🛠️ Module 9: Executive Board Report Engine (Implementation Guide)

This document provides the step-by-step technical implementation guide for building the PDF Report Engine in VistaraBI.

---

## Phase 1: Dependencies Setup
You will need two main packages to handle the client-side chart capturing and the server-side PDF generation.

```bash
cd vistarabi-landing
npm install @react-pdf/renderer html2canvas
```
*   `html2canvas`: Used in the browser to take a "screenshot" of the Recharts canvas.
*   `@react-pdf/renderer`: A React-based library that creates PDFs using Flexbox-like styling.

---

## Phase 2: Client-Side Capture (The Payload Builder)

Add a "Generate Report" button to the Module 8 `page.tsx`. When clicked, it will execute the following logic:

```typescript
import html2canvas from 'html2canvas';

async function handleGenerateReport(simulationContext, chatHistory) {
  // 1. Target the Strategy Canvas DOM element
  const chartElement = document.getElementById('strategy-canvas-container');
  
  // 2. Capture it as a base64 PNG
  const canvas = await html2canvas(chartElement);
  const chartImageBase64 = canvas.toDataURL('image/png');

  // 3. Build the Payload
  const payload = {
    chartImage: chartImageBase64,
    metrics: {
      probability: simulationContext.probabilityOfSuccess,
      reliability: simulationContext.reliabilityScore,
      gap: calculateGap(simulationContext)
    },
    chatSummary: chatHistory.map(msg => msg.text).join('\n')
  };

  // 4. Send to API
  const response = await fetch('/api/v1/report/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });

  // 5. Trigger File Download
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'VistaraBI_Executive_Report.pdf';
  a.click();
}
```

---

## Phase 3: The LLM Synthesizer (Server-Side)

Create a new API route: `src/app/api/v1/report/generate/route.ts`. 

The first step in this route is asking Ollama to write the executive summary.

```typescript
import { callLocalModel } from '@/lib/module-6/infrastructure/local-adapter';

async function generateExecutiveSummary(metrics, chatSummary) {
  const prompt = `
    You are an AI Executive Assistant. Write a 2-paragraph board-ready summary.
    Context:
    - Probability of Strategy Success: ${metrics.probability * 100}%
    - Strategy Gap: $${metrics.gap}
    - Recent AI Chat Context: ${chatSummary}
    
    Output strictly the professional text, no markdown code blocks.
  `;
  
  const response = await callLocalModel(
    "You write concise business reports.", 
    prompt, 
    0.2 // Low temperature for professional consistency
  );
  
  return response.text;
}
```

---

## Phase 4: The React-PDF Template

Define the visual structure of the PDF. This uses `@react-pdf/renderer` primitives (`<Document>`, `<Page>`, `<View>`, `<Text>`, `<Image>`).

Create `src/lib/module-9/ReportTemplate.tsx`:

```tsx
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

export const ExecutiveReport = ({ summaryText, metrics, chartImage }) => (
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
          <Text style={styles.metricValue}>${metrics.gap.toLocaleString()}</Text>
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
```

---

## Phase 5: Compiling the Response (API Route Continued)

Combine the LLM text, the base64 image, and the React-PDF template into a readable Node stream, and return it to the client.

```typescript
// Inside src/app/api/v1/report/generate/route.ts
import { renderToStream } from '@react-pdf/renderer';
import { ExecutiveReport } from '@/lib/module-9/ReportTemplate';

export async function POST(request: Request) {
  const { chartImage, metrics, chatSummary } = await request.json();

  // 1. Get the LLM Narrative
  const summaryText = await generateExecutiveSummary(metrics, chatSummary);

  // 2. Render the PDF
  const stream = await renderToStream(
    <ExecutiveReport 
      summaryText={summaryText} 
      metrics={metrics} 
      chartImage={chartImage} 
    />
  );

  // 3. Return as a downloadable file
  return new Response(stream as any, {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="Executive_Report.pdf"',
    },
  });
}
```

---

## Summary of Execution
1.  Frontend uses `html2canvas` to snap the chart.
2.  Frontend posts image + metrics to API.
3.  API asks Ollama to write the summary based on metrics.
4.  API uses `React-PDF` to compile the LLM text + the chart image into a PDF.
5.  PDF is streamed back to the browser for instant download. 
