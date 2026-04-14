import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { generateCompletion } from '../src/lib/ai/ollama-client';
import { KPI_LIBRARY } from '../src/lib/kpi/kpi-library';
import {
    buildDomainFeatureCatalog,
    buildSchemaPromptContext,
    discoverCsvFilesRecursive,
    writeDomainFeatureCatalog,
} from './lib/dataset-feature-catalog';

const DATASETS_ROOT = path.resolve(__dirname, '../datasets');
// We will look for data in datasets/<domain>/ first. 
// If empty, we fall back to dummy-data/clean/<domain>/ so tuning doesn't fail.
const CLEAN_DATA_ROOT = path.resolve(__dirname, '../dummy-data/clean');
const MODELFILES_DIR = path.resolve(__dirname, '../modelfiles');

const ALL_DOMAINS = [
    'ECOMMERCE',
    'SAAS',
    'EDTECH',
    'RETAIL',
    'SERVICES',
    'MANUFACTURING',
    'HEALTHCARE',
    'FINANCE',
] as const;

type DomainName = (typeof ALL_DOMAINS)[number];

function buildDeterministicSystemPrompt(domain: string, kpiNames: string): string {
    return [
        `You are VistaraBI's Senior Business Analyst for the ${domain} domain.`,
        'Use a strategic, evidence-first tone and avoid speculation.',
        'Always ground recommendations in available columns, relationships, and metric definitions.',
        'Prioritize KPI impact and data quality before proposing actions.',
        `Primary KPI vocabulary: ${kpiNames || 'Use domain KPI best practices from provided schema context.'}`,
        'When data is incomplete, explicitly state assumptions and confidence level.',
        'Output concise, executive-friendly insights with clear next actions.',
    ].join('\n');
}

function ensureDatasetDirectoryStructure(): void {
    if (!fs.existsSync(DATASETS_ROOT)) {
        fs.mkdirSync(DATASETS_ROOT, { recursive: true });
    }
    for (const domain of ALL_DOMAINS) {
        const domainDir = path.join(DATASETS_ROOT, domain.toLowerCase());
        if (!fs.existsSync(domainDir)) {
            fs.mkdirSync(domainDir, { recursive: true });
        }
    }
}

async function processUploadedDatasets() {
    console.log("📂 [Ingestion] Scanning datasets directory...");

    ensureDatasetDirectoryStructure();
    console.log("✅ Verified 'datasets/' directory structure.");

    // Check if user provided a specific domain via CLI args
    const targetDomainArg = process.argv[2]?.toUpperCase();
    let domainsToTune: readonly DomainName[] = ALL_DOMAINS;

    if (targetDomainArg) {
        if (ALL_DOMAINS.includes(targetDomainArg as DomainName)) {
            domainsToTune = [targetDomainArg as DomainName];
            console.log(`🎯 Targeted tuning requested for domain: ${targetDomainArg}`);
        } else {
            console.error(`❌ Invalid domain: ${targetDomainArg}. Choose from: ${ALL_DOMAINS.join(', ')}`);
            process.exit(1);
        }
    }

    for (const domain of domainsToTune) {
        await tuneDomainWithPersona(domain);
    }

    // Register Coder Model
    if (!targetDomainArg) {
        // Only re-register coder if we're doing a full run
        await registerCoderModel();
    }
    
    console.log("\n✨ Ingestion and Fine-Tuning Complete.");
}

async function tuneDomainWithPersona(domain: string) {
    console.log(`\n💎 [Fine-Tuning] Processing Domain: ${domain}...`);

    const targetDir = path.join(DATASETS_ROOT, domain.toLowerCase());
    const fallbackDir = path.join(CLEAN_DATA_ROOT, domain.toLowerCase());

    let activeDir = targetDir;
    let csvPaths = discoverCsvFilesRecursive(targetDir);

    if (csvPaths.length === 0) {
        console.log(`ℹ️ No new datasets found in 'datasets/${domain.toLowerCase()}/'. Falling back to 'dummy-data/clean/...`);
        if (fs.existsSync(fallbackDir)) {
            activeDir = fallbackDir;
            csvPaths = discoverCsvFilesRecursive(fallbackDir);
        }
    } else {
        console.log(`🚀 Found ${csvPaths.length} dataset(s) in 'datasets/${domain.toLowerCase()}/' (recursive scan).`);
    }

    if (csvPaths.length === 0) {
        console.warn(`⚠️ No data found for domain: ${domain}. Skipping...`);
        return;
    }

    const catalog = buildDomainFeatureCatalog(domain, activeDir);
    const schemaContext = buildSchemaPromptContext(catalog);
    const kpis = KPI_LIBRARY[domain as keyof typeof KPI_LIBRARY] || [];
    const kpiNames = kpis.map(k => k.name).join(', ');

    const catalogOutputPath = path.join(
        DATASETS_ROOT,
        domain.toLowerCase(),
        `${domain.toLowerCase()}-feature-catalog.json`
    );
    writeDomainFeatureCatalog(catalog, catalogOutputPath);
    console.log(`🧭 Wrote feature catalog: ${path.relative(path.resolve(__dirname, '..'), catalogOutputPath)}`);

    const prompt = `
Task: Generate a SYSTEM prompt for a "Senior Business Analyst" AI for the ${domain} domain.

CONTEXT:
Dataset/Feature Catalog:
${schemaContext}

KPIs to support: ${kpiNames}

GOAL:
- The AI must act as a Senior Business Analyst (Persona: Strategic, Analytical, Conservative with numbers).
- It must understand the ${domain} domain vocabulary perfectly.
- It must emphasize "Actionable Insights" and "Data Integrity".
- It must explain how different tables/columns relate to build the specified KPIs.

Output ONLY the SYSTEM prompt text.
`.trim();

    let generatedSystemPrompt: string;
    try {
        generatedSystemPrompt = await generateCompletion({
            model: 'qwen3.5:0.8b',
            prompt,
            temperature: 0.2
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ AI prompt generation failed for ${domain}, using deterministic fallback: ${message}`);
        generatedSystemPrompt = buildDeterministicSystemPrompt(domain, kpiNames);
    }

    const datasetOverview = catalog.datasets
        .map((dataset) => `# - ${dataset.relativePath} | rows=${dataset.rowCount} | cols=${dataset.columnCount}`)
        .join('\n');

    const modelfileContent = `
# VistaraBI Analytics — ${domain} (Business Analyst)
# Generated: ${new Date().toISOString()}
# Source Root: ${activeDir}
# Dataset Count: ${catalog.totalCsvFiles}
${datasetOverview}

FROM qwen3.5:0.8b

PARAMETER temperature 0.2
PARAMETER num_ctx 4096

SYSTEM """
### ACTIVE DATA CATALOG
${schemaContext}

${generatedSystemPrompt}
"""
`.trim();

    const modelfilePath = path.join(MODELFILES_DIR, `Modelfile.analytics.${domain.toLowerCase()}`);
    fs.writeFileSync(modelfilePath, modelfileContent);
    console.log(`📝 Updated Modelfile: ${path.relative(path.resolve(__dirname, '..'), modelfilePath)}`);

    const modelName = `vistara-analytics-${domain.toLowerCase()}`;
    console.log(`📦 Updating model: ${modelName}...`);
    try {
        execSync(`ollama create ${modelName} -f "${modelfilePath}"`, { stdio: 'inherit' });
        console.log(`✅ ${modelName} updated with Business Analyst persona.`);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Model build failed for ${domain}: ${message}`);
    }
}

async function registerCoderModel() {
    const coderPath = path.join(MODELFILES_DIR, 'Modelfile.coder');
    console.log("\n📦 Registering vistara-coder model...");
    try {
        execSync(`ollama create vistara-coder -f "${coderPath}"`, { stdio: 'inherit' });
        console.log("✅ Coder Model Ready (vistara-coder).");
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`❌ Coder model registration failed: ${message}`);
    }
}

processUploadedDatasets().catch(console.error);
