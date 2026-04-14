import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/app/api/v1/report/generate/route';

// vi.mock calls are hoisted — use vi.hoisted() to share the spy reference
const mockGenerateWithFallback = vi.hoisted(() =>
  vi.fn().mockResolvedValue({ content: 'Mocked executive summary text.' })
);

vi.mock('@/lib/ai/unified-ai-client', () => ({
  generateWithFallback: mockGenerateWithFallback
}));

vi.mock('@react-pdf/renderer', () => {
  return {
    renderToStream: vi.fn().mockResolvedValue('mocked-pdf-stream'),
    Document: ({ children }: any) => children,
    Page: ({ children }: any) => children,
    Text: ({ children }: any) => children,
    View: ({ children }: any) => children,
    StyleSheet: { create: (s: any) => s },
    Image: ({ src }: any) => src,
  };
});

describe('Module 9: Executive Board Report Engine API', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGenerateWithFallback.mockResolvedValue({ content: 'Mocked executive summary text.' });
  });

  it('should return 400 if required fields are missing', async () => {
    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  it('should return 400 if chartImage is missing', async () => {
    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify({ metrics: { probability: 0.8, gap: 100 } }),
    });

    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain('Missing required fields');
  });

  it('should generate a PDF and return it as a stream with proper headers', async () => {
    const payload = {
      domain: 'ECOMMERCE',
      chartImage: 'data:image/png;base64,mockbase64',
      metrics: {
        probability: 0.85,
        reliability: 90,
        gap: 15000
      },
      chatSummary: 'Discussed increasing ad spend.'
    };

    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);
    
    // Check if response is successful and has correct headers
    expect(res.status).toBe(200);
    expect(res.headers.get('Content-Type')).toBe('application/pdf');
    expect(res.headers.get('Content-Disposition')).toBe('attachment; filename="VistaraBI_Strategic_Report.pdf"');
    
    // Check that it's returning a readable stream (the mocked string)
    const bodyText = await res.text();
    expect(bodyText).toBe('mocked-pdf-stream');
  });

  it('should call the LLM with a prompt containing the probability percentage', async () => {
    const payload = {
      domain: 'ECOMMERCE',
      chartImage: 'data:image/png;base64,abc123',
      metrics: {
        probability: 0.72,  // 72%
        reliability: 85,
        gap: 5000
      },
      chatSummary: 'User explored email campaign strategy.'
    };

    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await POST(req);

    // Verify unified AI client was called once
    expect(mockGenerateWithFallback).toHaveBeenCalledTimes(1);

    // Verify prompt payload shape + probability value
    const requestPayload = mockGenerateWithFallback.mock.calls[0]?.[0];
    const userPrompt = requestPayload?.messages?.[0]?.content ?? '';
    expect(userPrompt).toContain('72.0%');

    // Verify it uses low temperature for professional consistency
    expect(requestPayload?.temperature).toBeLessThanOrEqual(0.3);
  });

  it('should call the LLM with board-ready narrative instructions', async () => {
    const payload = {
      domain: 'ECOMMERCE',
      chartImage: 'data:image/png;base64,abc123',
      metrics: { probability: 0.5, reliability: 70, gap: 10000 },
      chatSummary: 'Initial strategy discussion.'
    };

    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await POST(req);

    const requestPayload = mockGenerateWithFallback.mock.calls[0]?.[0];
    const userPrompt = requestPayload?.messages?.[0]?.content?.toLowerCase() ?? '';
    expect(userPrompt).toContain('board-ready summary');
    expect(userPrompt).toContain('domain: ecommerce');
  });

  it('should include the chatSummary in the LLM prompt context', async () => {
    const chatSummary = 'The user decided to launch a targeted email campaign with 15% uplift.';
    const payload = {
      domain: 'ECOMMERCE',
      chartImage: 'data:image/png;base64,abc123',
      metrics: { probability: 0.65, reliability: 80, gap: 8000 },
      chatSummary,
    };

    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await POST(req);

    const requestPayload = mockGenerateWithFallback.mock.calls[0]?.[0];
    const userPrompt = requestPayload?.messages?.[0]?.content ?? '';
    expect(userPrompt).toContain(chatSummary);
  });

  it('should use fallback chat summary text when chatSummary is not provided', async () => {
    const payload = {
      domain: 'ECOMMERCE',
      chartImage: 'data:image/png;base64,abc123',
      metrics: { probability: 0.5, reliability: 70, gap: 10000 },
      // chatSummary intentionally omitted
    };

    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    const res = await POST(req);

    expect(res.status).toBe(200);
    expect(mockGenerateWithFallback).toHaveBeenCalledTimes(1);

    const requestPayload = mockGenerateWithFallback.mock.calls[0]?.[0];
    const userPrompt = requestPayload?.messages?.[0]?.content ?? '';
    expect(userPrompt).toContain('Analysis of recent data trends.');
  });

  it('should include the strategy gap value in the LLM prompt', async () => {
    const payload = {
      domain: 'ECOMMERCE',
      chartImage: 'data:image/png;base64,abc123',
      metrics: { probability: 0.55, reliability: 75, gap: 12500 },
      chatSummary: 'Gap analysis conversation.'
    };

    const req = new Request('http://localhost:3000/api/v1/report/generate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    await POST(req);

    const requestPayload = mockGenerateWithFallback.mock.calls[0]?.[0];
    const userPrompt = requestPayload?.messages?.[0]?.content ?? '';
    expect(userPrompt).toContain('$12500');
  });
});

// ─── ReportTemplate Component Unit Tests ─────────────────────────────────────

describe('Module 9: ReportTemplate Component', () => {
  it('renders without throwing when given valid props', async () => {
    const { ExecutiveReport } = await import('../../src/lib/module-9/ReportTemplate');

    expect(() =>
      ExecutiveReport({
        summaryText: 'The strategy is on track to achieve its revenue target.',
        metrics: { probability: 0.82, reliability: 90, gap: 5000 },
        chartImage: 'data:image/png;base64,abc123',
      })
    ).not.toThrow();
  });

  it('returns a truthy React-PDF Document element', async () => {
    const { ExecutiveReport } = await import('../../src/lib/module-9/ReportTemplate');

    const element = ExecutiveReport({
      summaryText: 'Strategic summary text here.',
      metrics: { probability: 0.75, reliability: 85, gap: 10000 },
      chartImage: 'data:image/png;base64,xyz',
    });

    expect(element).toBeTruthy();
  });

  it('handles empty chartImage without crashing', async () => {
    const { ExecutiveReport } = await import('../../src/lib/module-9/ReportTemplate');

    expect(() =>
      ExecutiveReport({
        summaryText: 'Summary here.',
        metrics: { probability: 0.5, reliability: 70, gap: 20000 },
        chartImage: '',  // empty — conditional render in template
      })
    ).not.toThrow();
  });

  it('accepts 0% probability without crashing', async () => {
    const { ExecutiveReport } = await import('../../src/lib/module-9/ReportTemplate');

    expect(() =>
      ExecutiveReport({
        summaryText: 'Low probability scenario.',
        metrics: { probability: 0, reliability: 40, gap: 50000 },
        chartImage: 'data:image/png;base64,x',
      })
    ).not.toThrow();
  });

  it('accepts 100% probability without crashing', async () => {
    const { ExecutiveReport } = await import('../../src/lib/module-9/ReportTemplate');

    expect(() =>
      ExecutiveReport({
        summaryText: 'Highly achievable goal.',
        metrics: { probability: 1.0, reliability: 100, gap: 0 },
        chartImage: 'data:image/png;base64,x',
      })
    ).not.toThrow();
  });
});

