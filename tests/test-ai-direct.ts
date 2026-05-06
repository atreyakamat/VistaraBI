import { generateWithFallback } from '../src/lib/ai/unified-ai-client';
import { checkOllamaHealth } from '../src/lib/ai/ollama-client';

async function testAI() {
    console.log("Checking Ollama Health...");
    const isHealthy = await checkOllamaHealth();
    console.log(`Ollama Health: ${isHealthy}`);

    console.log("Testing simple AI generation...");
    try {
        const response = await generateWithFallback({
            messages: [{ role: 'user', content: 'What is 2+2? Keep it short.' }],
            temperature: 0.1,
            maxTokens: 50,
            agentRole: 'general'
        });
        console.log(`✅ Success! Provider: ${response.provider}, Model: ${response.model}`);
        console.log(`Response: ${response.content}`);
    } catch (e) {
        console.error("❌ Failed:", e.message);
    }
}

testAI().catch(console.error);
