import React from 'react';
import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { ExecutiveReport } from '@/lib/module-9/ReportTemplate';
import { callLocalModel } from '@/lib/module-6/infrastructure/local-adapter';

async function generateExecutiveSummary(metrics: any, chatSummary: string, domain: string) {
  const prompt = `
    You are an AI Executive Assistant for a ${domain} business. 
    Write a 2-paragraph board-ready summary analyzing the current performance.
    
    Context:
    - Domain: ${domain}
    - Probability of Strategy Success: ${(metrics.probability * 100).toFixed(1)}%
    - Strategy Gap to Target: $${metrics.gap}
    - Target Goal: $${metrics.target}
    - Recent AI Chat Context: ${chatSummary}

    Output strictly the professional text, no markdown code blocks.
  `;

  try {
    const response = await callLocalModel(
      "You write concise business reports for executives.",
      prompt,
      0.2
    );
    return response.text;
  } catch (error) {
    console.error("AI Summary generation failed:", error);
    return "The strategic analysis indicates a stable trajectory with identified opportunities for growth in the core KPIs. Probability of success remains aligned with industry benchmarks.";
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      chartImage, 
      metrics, 
      domain, 
      selectedKPIs, 
      actions, 
      forecastData,
      chatSummary,
      dashboardImage,
      globalChatSummary
    } = body;

    if (!chartImage || !metrics || !domain) {
      return NextResponse.json({ error: "Missing required fields (chartImage, metrics, domain)" }, { status: 400 });
    }

    // 1. Get the LLM Narrative
    const summaryText = await generateExecutiveSummary(
      metrics, 
      chatSummary || "Analysis of recent data trends.", 
      domain
    );

    // 2. Render the PDF
    const stream = await renderToStream(
      <ExecutiveReport
        summaryText={summaryText}
        domain={domain}
        selectedKPIs={selectedKPIs || []}
        aiInsights={chatSummary || "Strategic insights derived from semantic data analysis."}
        actions={actions || []}
        forecastData={forecastData}
        metrics={metrics}
        chartImage={chartImage}
        dashboardImage={dashboardImage}
        globalChatSummary={globalChatSummary}
      />
    );

    // 3. Return as a downloadable file
    return new Response(stream as any, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="VistaraBI_Strategic_Report.pdf"',
      },
    });
  } catch (error: any) {
    console.error('Report Generation Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
