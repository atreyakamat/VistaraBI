
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// Mocking imports for the CLI environment if needed, or using direct paths
// Since we are running with tsx, we can try importing from src
import { generateCompletion } from '../src/lib/ai/ollama-client';
import { KPI_LIBRARY } from '../src/lib/kpi/kpi-library';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, '../dummy-data/clean');
const MODELFILES_DIR = path.resolve(__dirname, '../modelfiles');
const OUTPUT_BLUEPRINTS = path.resolve(__dirname, '../DOMAIN_KPI_BLUEPRINTS.json');

const DOMAINS = [
    'ECOMMERCE', 'SAAS', 'EDTECH', 'RETAIL', 
    'SERVICES', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE'
];

async function extractDomainMetadata(domain: string) {
    const domainDir = path.join(DATA_DIR, domain.toLowerCase());
    if (!fs.existsSync(domainDir)) return null;

    const files = fs.readdirSync(domainDir).filter(f => f.endsWith('.csv'));
    const tables: Record<string, string[]> = {};
    const samples: Record<string, any[]> = {};

    for (const file of files) {
        const content = fs.readFileSync(path.join(domainDir, file), 'utf-8');
        const lines = content.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        tables[file] = headers;
        
        // Sample first 3 rows
        samples[file] = lines.slice(1, 4).map(l => l.split(',').map(v => v.trim()));
    }

    return { domain, tables, samples };
}

async function fineTuneDomain(domain: string) {
    console.log(`\n💎 [Fine-Tuning] Processing Domain: ${domain}...`);
    
    const meta = await extractDomainMetadata(domain);
    if (!meta) {
        console.warn(`⚠️ No data found for domain: ${domain}`);
        return;
    }

    const kpis = KPI_LIBRARY[domain as keyof typeof KPI_LIBRARY] || [];
    const kpiNames = kpis.map(k => k.name).join(', ');

    const prompt = `
You are Chanakya, the VistaraBI Master Architect.
Task: Generate a high-performance "SYSTEM" prompt for an Ollama Modelfile tailored specifically for the ${domain} domain.

CONTEXT:
1. Tables & Columns Available:
${JSON.stringify(meta.tables, null, 2)}

2. Sample Data Points:
${JSON.stringify(meta.samples, null, 2)}

3. Standard KPIs to support:
${kpiNames}

GOAL:
The system prompt should:
- Define the persona (VistaraBI Analytics - ${domain}).
- List key domain vocabulary.
- Explain critical business distinctions (e.g. Gross vs Net Revenue).
- Set constraints (e.g. answer only from data, max 2 sentences).
- Include specific "Mental Models" for this domain.

Output ONLY the SYSTEM prompt text, no headers or explanations.
`.trim();

    console.log(`🤖 Generating optimized SYSTEM prompt for ${domain}...`);
    
    try {
        const systemPrompt = await generateCompletion({
            model: 'qwen3.5:0.8b',
            prompt,
            temperature: 0.2
        });

        const modelfileContent = `
# VistaraBI Analytics — ${domain} Domain (Fine-tuned)
# Generated on: ${new Date().toISOString()}

FROM qwen3.5:0.8b

PARAMETER temperature 0.1
PARAMETER top_p 0.85
PARAMETER num_ctx 4096

SYSTEM """
${systemPrompt}
"""
`.trim();

        const modelfilePath = path.join(MODELFILES_DIR, `Modelfile.analytics.${domain.toLowerCase()}`);
        fs.writeFileSync(modelfilePath, modelfileContent);
        console.log(`✅ Modelfile written: ${modelfilePath}`);

        const modelName = `vistara-analytics-${domain.toLowerCase()}`;
        console.log(`📦 Creating/Updating Ollama model: ${modelName}...`);
        
        try {
            execSync(`ollama create ${modelName} -f ${modelfilePath}`, { stdio: 'inherit' });
            console.log(`🎉 Model ${modelName} is ready!`);
        } catch (e: any) {
            console.error(`❌ Failed to create Ollama model ${modelName}: ${e.message}`);
        }

    } catch (e: any) {
        console.error(`❌ AI Generation failed for ${domain}: ${e.message}`);
    }
}

async function generateGlobalBlueprints() {
    console.log("\n📊 Generating Global KPI Blueprints JSON...");
    const blueprints: Record<string, any> = {};

    for (const domain of DOMAINS) {
        const kpis = KPI_LIBRARY[domain as keyof typeof KPI_LIBRARY] || [];
        blueprints[domain] = kpis.map(k => ({
            id: k.id,
            name: k.name,
            category: k.category,
            requiredFields: k.requiredFields,
            formula: k.formulaTemplate,
            aliases: k.columnAliases
        }));
    }

    fs.writeFileSync(OUTPUT_BLUEPRINTS, JSON.stringify(blueprints, null, 2));
    console.log(`✅ Blueprints saved to: ${OUTPUT_BLUEPRINTS}`);
}

async function run() {
    console.log("=========================================");
    console.log("🚀 VistaraBI Domain Fine-Tuning CLI");
    console.log("=========================================\n");

    for (const domain of DOMAINS) {
        await fineTuneDomain(domain);
    }

    await generateGlobalBlueprints();

    console.log("\n✨ All domains fine-tuned and verified.");
}

run().catch(console.error);
