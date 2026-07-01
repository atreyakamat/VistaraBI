import { generateSimple } from './src/lib/ai/unified-ai-client';

// Force Groq for this test
process.env.FORCE_GROQ = 'true';
process.env.PREFER_LOCAL = 'false';

async function run() {
    console.log("Testing Groq API...");
    try {
        const response = await generateSimple("Hello! Please reply with exactly one word: 'Success'.", 'general', 0.1);
        console.log("Status: OK");
        console.log("Provider:", response.provider);
        console.log("Model:", response.model);
        console.log("Response:", response.content);
        console.log("Latency (ms):", response.latencyMs);
        console.log("Tokens:", response.tokensUsed);
    } catch (e) {
        console.error("Error calling AI client:", e);
    }
}

run();
