import * as fs from 'fs';
import * as path from 'path';
import { DomainType } from '@/lib/prisma';
import { buildSemanticColumnMapFromAliases } from '@/lib/kpi/semantic-column-aliases';
import { evaluateEligibility } from '@/lib/kpi/kpi-eligibility-engine';
import { generateKPISuggestions } from '@/lib/ai/ollama-client';

const DATA_DIR = path.join(__dirname, '../dummy-data/clean');

function getHeadersFromCsv(filePath: string): string[] {
    const fileContent = fs.readFileSync(filePath, 'utf-8');
    const firstLine = fileContent.split('\n')[0];
    return firstLine.split(',').map(h => h.trim());
}

async function runPipeline() {
    console.log("=========================================");
    console.log("🚀 VistaraBI Domain CLI Training Tester ");
    console.log("=========================================\n");

    const domains = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());

    let totalFiles = 0;
    let totalUnlockedKpis = 0;

    for (const domainDir of domains) {
        const domainPath = path.join(DATA_DIR, domainDir);
        const files = fs.readdirSync(domainPath).filter(f => f.endsWith('.csv'));
        const domainEnum = domainDir.toUpperCase() as DomainType;

        console.log(`\n📂 Investigating Domain: ${domainEnum}`);

        for (const file of files) {
            totalFiles++;
            const filePath = path.join(domainPath, file);
            const headers = getHeadersFromCsv(filePath);
            
            console.log(`  📄 File: ${file} | Columns: ${headers.length}`);
            
            // 1. Semantic Mapping
            const semanticMap = buildSemanticColumnMapFromAliases(headers, domainEnum);
            const mappedRoles = Object.keys(semanticMap);
            console.log(`     -> Mapped Semantic Roles: ${mappedRoles.length > 0 ? mappedRoles.join(', ') : 'None'}`);

            // 2. KPI Eligibility Evaluation
            // We pass empty relationships here for simple single-table evaluations
            const eligibility = evaluateEligibility(domainEnum, semanticMap as any, []);
            
            const unlocked = eligibility.unlockedKPIs.length;
            totalUnlockedKpis += unlocked;
            console.log(`     -> Unlocked KPIs: ${unlocked}`);
            
            for (const kpi of eligibility.unlockedKPIs) {
                console.log(`        ✅ ${kpi.name}`);
            }

            // 3. AI Modelfile Generation Test (only doing one file per domain to save time)
            if (files.indexOf(file) === 0) {
                console.log(`     -> 🤖 Testing AI Modelfile Generation for ${domainEnum}...`);
                try {
                    // Create dummy sample data using just headers
                    const dummySample = [headers.reduce((acc, h) => ({...acc, [h]: "sample_val"}), {})];
                    
                    const kpiSuggestions = await generateKPISuggestions(headers, dummySample, domainEnum);
                    console.log(`        -> AI Successfully Suggested ${kpiSuggestions.length} KPIs:`);
                    for (const suggestion of kpiSuggestions) {
                        console.log(`           ✨ ${suggestion.name}: ${suggestion.formula}`);
                    }
                } catch (error: any) {
                    console.log(`        -> ❌ AI Generation Failed: ${error.message}`);
                }
            }
        }
    }

    console.log("\n=========================================");
    console.log(`🏁 Summary: Analyzed ${totalFiles} files. Unlocked ${totalUnlockedKpis} total rule-based KPIs.`);
    console.log("=========================================\n");
}

runPipeline().catch(console.error);
