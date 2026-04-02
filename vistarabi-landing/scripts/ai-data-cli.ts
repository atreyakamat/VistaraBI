import * as fs from 'fs';
import * as path from 'path';
import { generateCompletion } from '@/lib/ai/ollama-client';
import { DomainType } from '@/lib/prisma';
import { buildSemanticColumnMapFromAliases } from '@/lib/kpi/semantic-column-aliases';

const DATA_DIR = path.join(__dirname, '../dummy-data/clean');

interface DatasetMeta {
    domain: string;
    filename: string;
    columns: string[];
    semanticRolesLocked: string[];
}

function getDatasetMetadata(): DatasetMeta[] {
    const meta: DatasetMeta[] = [];
    const domains = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());

    for (const domain of domains) {
        const domainPath = path.join(DATA_DIR, domain);
        const files = fs.readdirSync(domainPath).filter(f => f.endsWith('.csv'));
        
        for (const file of files) {
            const content = fs.readFileSync(path.join(domainPath, file), 'utf-8').trim();
            const lines = content.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            
            // Minimize context size: Just send headers and dataset type, omit full raw samples
            const domainEnum = domain.toUpperCase() as DomainType;
            const semanticMap = buildSemanticColumnMapFromAliases(headers, domainEnum);

            meta.push({
                domain: domain.toUpperCase(),
                filename: file,
                columns: headers,
                semanticRolesLocked: Object.keys(semanticMap),
            });
        }
    }
    return meta;
}

async function runGlobalDataBrain() {
    console.log("=========================================");
    console.log("🧠 VistaraBI Global AI Data CLI");
    console.log("=========================================\n");

    console.log("📦 Packaging all datasets...");
    const allData = getDatasetMetadata();
    
    console.log(`✅ Loaded ${allData.length} datasets across multiple domains.`);
    
    // We package the metadata into a JSON block for Ollama
    const dataPackageJSON = JSON.stringify(allData, null, 2);

    const prompt = `
I have uploaded several datasets into the VistaraBI platform. Here is the metadata package describing all available files, their columns, and the semantic roles we have mapped:

${dataPackageJSON}

Task:
1. Provide a brief executive summary of what kind of data the user has uploaded overall.
2. Cross-Domain Insight: Suggest 2 high-level strategic questions the user could answer by combining data across these domains (e.g., if there is Finance and HR, how do they relate?).
3. Recommend the top 3 most valuable KPIs that can be built from this overall data package.

Give your response in Markdown Format.
    `.trim();

    console.log("\n🤖 Sending Global Data Package to Ollama (vistara-analytics model)...\n");

    try {
        const response = await generateCompletion({
            model: 'vistara-analytics', // The generic shared model we created
            messages: [
                {
                    role: 'system',
                    content: 'You are Chanakya, the Chief of Staff AI for VistaraBI. You have global visibility into ALL the data the user has uploaded. You act as an executive data architect.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.3
        });

        console.log(response);

    } catch (e: any) {
        console.error("❌ Ollama Generation Error: ", e.message);
    }
}

// Allow passing query from CLI
runGlobalDataBrain().catch(console.error);
