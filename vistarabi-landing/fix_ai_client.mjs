import fs from 'fs';

let content = fs.readFileSync('src/lib/ai/unified-ai-client.ts', 'utf8');

const replacement1 = `    if (cloudUrl && cloudKey && !cloudUrl.includes('ollama.com')) {
        if (cloudUrl.includes('openai') || cloudUrl.includes('groq') || cloudUrl.includes('openrouter')) {
            cloudConfigs.push({
                provider: 'openrouter',
                model: cloudModelEnv,
                baseUrl: cloudUrl,
                apiKey: cloudKey,
                timeout: 60000,
            });
        } else {
            cloudConfigs.push({
                provider: 'ollama-cloud',
                model: cloudModelEnv,
                baseUrl: cloudUrl,
                apiKey: cloudKey,
                timeout: 60000,
            });
        }
    }`;

content = content.replace(/if \(cloudUrl && cloudKey && !cloudUrl\.includes\('ollama\.com'\)\) \{[\s\S]*?timeout: 60000,\s*\}\);\s*\}/, replacement1);

const replacement2 = `            body: JSON.stringify({
                model: config.model,
                messages: options.messages,
                temperature: options.temperature ?? 0.2,
                max_tokens: options.maxTokens ?? 1024,
                stream: useStreaming,
                ...(useStreaming && { stream_options: { include_usage: true } }),
            }),`;
content = content.replace(/body: JSON\.stringify\(\{\s*model: config\.model,[\s\S]*?stream: useStreaming,\s*\}\),/, replacement2);

fs.writeFileSync('src/lib/ai/unified-ai-client.ts', content);

let cloudAdapter = fs.readFileSync('src/lib/module-6/infrastructure/cloud-adapter.ts', 'utf8');
const replacement3 = `    if (ollamaUrl && ollamaKey) {
        if (ollamaUrl.includes('openai') || ollamaUrl.includes('groq') || ollamaUrl.includes('openrouter')) {
            return {
                mode: 'openai',
                baseUrl: ollamaUrl,
                apiKey: ollamaKey,
                model: ollamaModel,
            };
        }
        return {
            mode: 'ollama-chat',
            baseUrl: ollamaUrl,
            apiKey: ollamaKey,
            model: ollamaModel,
        };
    }`;
cloudAdapter = cloudAdapter.replace(/if \(ollamaUrl && ollamaKey\) \{[\s\S]*?model: ollamaModel,\s*\};\s*\}/, replacement3);
fs.writeFileSync('src/lib/module-6/infrastructure/cloud-adapter.ts', cloudAdapter);

console.log("Replaced successfully!");
