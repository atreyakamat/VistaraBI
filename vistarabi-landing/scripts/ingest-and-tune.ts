
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { generateCompletion } from '../src/lib/ai/ollama-client';
import { KPI_LIBRARY } from '../src/lib/kpi/kpi-library';

const DATASETS_ROOT = path.resolve(__dirname, '../datasets');
const CLEAN_DATA_ROOT = path.resolve(__dirname, '../dummy-data/clean');
const MODELFILES_DIR = path.resolve(__dirname, '../modelfiles');
const OUTPUT_BLUEPRINTS = path.resolve(__dirname, '../DOMAIN_KPI_BLUEPRINTS.json');

const DOMAINS = ['ECOMMERCE', 'SAAS', 'EDTECH', 'RETAIL', 'SERVICES', 'MANUFACTURING', 'HEALTHCARE', 'FINANCE'];

async function processUploadedDatasets() {
    console.log("📂 [Ingestion] Scanning datasets directory...");
    
    if (!fs.existsSync(DATASETS_ROOT)) {
        fs.mkdirSync(DATASETS_ROOT, { recursive: true });
        console.log("✅ Created 'datasets/' directory.");
    }

    const files = fs.readdirSync(DATASETS_ROOT).filter(f => f.endsWith('.csv'));
    
    if (files.length === 0) {
        console.log("ℹ️ No new datasets found in 'datasets/'. Applying Business Analyst persona to existing domain data...");
    } else {
        console.log(`🚀 Found ${files.length} new datasets. Organizing and tuning...`);
    }

    // Always run tuning to apply the new Business Analyst persona
    for (const domain of DOMAINS) {
        await tuneDomainWithPersona(domain);
    }

    // Register Coder Model
    await registerCoderModel();
    
    console.log("\n✨ Ingestion and Fine-Tuning Complete.");
}

async function tuneDomainWithPersona(domain: string) {
    console.log(`\n💎 [Fine-Tuning] Processing Domain: ${domain}...`);
    
    const domainDir = path.join(CLEAN_DATA_ROOT, domain.toLowerCase());
    if (!fs.existsSync(domainDir)) return;

    const files = fs.readdirSync(domainDir).filter(f => f.endsWith('.csv'));
    const schemaInfo: any = {};
    
    for (const file of files) {
        const content = fs.readFileSync(path.join(domainDir, file), 'utf-8');
        schemaInfo[file] = content.split('\n')[0].split(',').map(h => h.trim());
    }

    const kpis = KPI_LIBRARY[domain as keyof typeof KPI_LIBRARY] || [];
    const kpiNames = kpis.map(k => k.name).join(', ');

    const prompt = `
Task: Generate a SYSTEM prompt for a "Senior Business Analyst" AI for the ${domain} domain.

CONTEXT:
Available Tables/Columns: ${JSON.stringify(schemaInfo)}
KPIs to support: ${kpiNames}

GOAL:
- The AI must act as a Senior Business Analyst (Persona: Strategic, Analytical, Conservative with numbers).
- It must understand the ${domain} domain vocabulary perfectly.
- It must emphasize "Actionable Insights" and "Data Integrity".
- It must explain how different columns relate to build the specified KPIs.

Output ONLY the SYSTEM prompt text.
`.trim();

    try {
        const systemPrompt = await generateCompletion({
            model: 'qwen3.5:0.8b',
            prompt,
            temperature: 0.2
        });

        const modelfileContent = `
# VistaraBI Analytics — ${domain} (Business Analyst)
# Generated: ${new Date().toISOString()}

FROM qwen3.5:0.8b

PARAMETER temperature 0.2
PARAMETER num_ctx 4096

SYSTEM """
${systemPrompt}
"""
`.trim();

        const modelfilePath = path.join(MODELFILES_DIR, `Modelfile.analytics.${domain.toLowerCase()}`);
        fs.writeFileSync(modelfilePath, modelfileContent);
        
        const modelName = `vistara-analytics-${domain.toLowerCase()}`;
        console.log(`📦 Updating model: ${modelName}...`);
        execSync(`ollama create ${modelName} -f ${modelfilePath}`);
        console.log(`✅ ${modelName} updated with Business Analyst persona.`);

    } catch (e: any) {
        console.error(`❌ Tuning failed for ${domain}: ${e.message}`);
    }
}

async function registerCoderModel() {
    const coderPath = path.join(MODELFILES_DIR, 'Modelfile.coder');
    console.log("\n📦 Registering vistara-coder model...");
    try {
        execSync(`ollama create vistara-coder -f ${coderPath}`);
        console.log("✅ Coder Model Ready (vistara-coder).");
    } catch (e: any) {
        console.error("❌ Coder model registration failed.");
    }
}

processUploadedDatasets().catch(console.error);
