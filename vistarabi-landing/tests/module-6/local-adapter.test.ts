// local-adapter.test.ts — Module 6D Ollama adapter tests
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { callLocalModel } from '../../src/lib/module-6/infrastructure/local-adapter';
import { ModelCallError } from '../../src/lib/module-6/infrastructure/types';

// ─── Mock fetch ───────────────────────────────────────────────────────────────

const mockFetch = vi.fn();
global.fetch = mockFetch;

function makeOllamaResponse(text: string, promptTokens = 10, evalTokens = 20): Response {
    return new Response(
        JSON.stringify({
            message: {
                role: 'assistant',
                content: text,
            },
            prompt_eval_count: promptTokens,
            eval_count: evalTokens,
            done: true,
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('local-adapter — callLocalModel()', () => {
    beforeEach(() => { 
        mockFetch.mockClear(); 
        // Ensure no cloud env vars block local path in tests
        delete process.env.RENDER;
        delete process.env.RAILWAY_ENVIRONMENT;
        delete process.env.VERCEL;
        delete process.env.GROQ_API_KEY;
        delete process.env.OPENROUTER_API_KEY;
    });

    it('successful call → AdapterResponse with text and tokens', async () => {
        mockFetch.mockResolvedValueOnce(makeOllamaResponse('Revenue increased by 12% month-over-month.'));

        const result = await callLocalModel('You are a narrator.', 'What happened?', 0.1);
        expect(result.text).toBe('Revenue increased by 12% month-over-month.');
        expect(result.modelId).toBe(process.env.OLLAMA_MODEL || 'qwen3.5:0.8b');
        expect(result.inputTokens).toBe(10);
        expect(result.outputTokens).toBe(20);
        expect(typeof result.latencyMs).toBe('number');
        expect(result.latencyMs).toBeGreaterThanOrEqual(0);
    });

    it('uses OLLAMA_URL env var', async () => {
        process.env.OLLAMA_URL = 'http://custom-host:11434';
        mockFetch.mockResolvedValueOnce(makeOllamaResponse('OK'));

        await callLocalModel('sys', 'user', 0.1);

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain('custom-host:11434');

        delete process.env.OLLAMA_URL;
    });

    it('defaults to localhost:11434 when env not set', async () => {
        delete process.env.OLLAMA_BASE_URL;
        mockFetch.mockResolvedValueOnce(makeOllamaResponse('OK'));

        await callLocalModel('sys', 'user', 0.0);

        const calledUrl = mockFetch.mock.calls[0][0] as string;
        expect(calledUrl).toContain('localhost:11434');
    });

    it('HTTP 500 → returns Demo Mode fallback', async () => {
        mockFetch.mockResolvedValueOnce(new Response('Internal error', { status: 500 }));

        const result = await callLocalModel('sys', 'user', 0.1);
        expect(result.text).toContain('[Demo Mode]');
    });

    it('network failure → returns Demo Mode fallback', async () => {
        mockFetch.mockRejectedValueOnce(new Error('ECONNREFUSED'));

        const result = await callLocalModel('sys', 'user', 0.1);
        expect(result.text).toContain('[Demo Mode]');
    });

    it('AbortError (timeout) → returns Demo Mode fallback', async () => {
        const abortError = new Error('aborted');
        abortError.name = 'AbortError';
        mockFetch.mockRejectedValueOnce(abortError);

        const result = await callLocalModel('sys', 'user', 0.1);
        expect(result.text).toContain('[Demo Mode]');
    });

    it('empty response string → returns Demo Mode fallback', async () => {
        mockFetch.mockResolvedValueOnce(new Response(
            JSON.stringify({ message: { content: '' }, done: true }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
        ));

        const result = await callLocalModel('sys', 'user', 0.1);
        expect(result.text).toContain('[Demo Mode]');
    });
});
