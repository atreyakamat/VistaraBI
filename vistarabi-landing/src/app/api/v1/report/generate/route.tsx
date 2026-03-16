import { NextResponse } from 'next/server';
import { renderToStream } from '@react-pdf/renderer';
import { ExecutiveReport } from '@/lib/module-9/ReportTemplate';
import { callLocalModel } from '@/lib/module-6/infrastructure/local-adapter';

async function generateExecutiveSummary(metrics: any, chatSummary: string) {
  const prompt = `
    You are an AI Executive Assistant. Write a 2-paragraph board-ready summary.
    Context:
    - Probability of Strategy Success: ${(metrics.probability * 100).toFixed(1)}%
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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { chartImage, metrics, chatSummary } = body;

    if (!chartImage || !metrics) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Get the LLM Narrative
    const summaryText = await generateExecutiveSummary(metrics, chatSummary || "No chat history provided.");

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
  } catch (error: any) {
    console.error("Report Generation Error:", error);
    return NextResponse.json({ error: error.message || "Failed to generate report" }, { status: 500 });
  }
}
