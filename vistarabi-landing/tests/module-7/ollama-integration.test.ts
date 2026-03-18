import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkOllamaHealth, generateCompletion } from '@/lib/ai/ollama-client';

// Mocking the global fetch for Ollama API calls
global.fetch = vi.fn();

describe('Module 7: Ollama Integration Backend Test', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should verify if Ollama service is reachable (Health Check)', async () => {
        (fetch as any).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => ({ models: [{ name: 'qwen3:0.6b' }] }),
        });

        const isHealthy = await checkOllamaHealth();
        expect(isHealthy).toBe(true);
        expect(fetch).toHaveBeenCalledWith(expect.stringContaining('/api/tags'), expect.anything());
    });

    it('should handle Ollama service being offline gracefully', async () => {
        (fetch as any).mockRejectedValue(new Error('ECONNREFUSED'));

        const isHealthy = await checkOllamaHealth();
        expect(isHealthy).toBe(false);
    });

    it('should generate a strategic completion from a mock prompt', async () => {
        const mockResponse = {
            model: 'qwen3:0.6b',
            created_at: new Date().toISOString(),
            response: 'Increase marketing spend by 10% to boost customer acquisition.',
            done: true,
        };

        (fetch as any).mockResolvedValue({
            ok: true,
            status: 200,
            json: async () => mockResponse,
            text: async () => JSON.stringify(mockResponse),
        });

        const result = await generateCompletion({
            prompt: 'How to increase revenue?',
            temperature: 0.7
        });
        
        expect(result).toContain('Increase marketing spend');
        expect(fetch).toHaveBeenCalledWith(
            expect.stringContaining('/api/generate'),
            expect.objectContaining({
                method: 'POST',
                body: expect.stringContaining('How to increase revenue?'),
            })
        );
    });

    it('should throw an error when Ollama fails during generation after retries', async () => {
        (fetch as any).mockResolvedValue({
            ok: false,
            status: 500,
            text: async () => 'Internal Server Error',
        });

        // generateCompletion throws after maxRetries
        await expect(generateCompletion({
            prompt: 'Test query'
        })).rejects.toThrow(/Ollama generate failed/);
    });
});
