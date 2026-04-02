
import * as fs from 'fs';
import * as path from 'path';
import { generateCompletion } from '../src/lib/ai/ollama-client';
import { DomainType } from '../src/lib/prisma';
import { buildSemanticColumnMapFromAliases } from '../src/lib/kpi/semantic-column-aliases';

const DATA_DIR = path.join(__dirname, '../dummy-data/clean');

interface DatasetMeta {
    domain: string;
    filename: string;
    columns: string[];
    sampleValues: Record<string, string>;
    semanticRolesLocked: string[];
}

function getDatasetMetadata(): DatasetMeta[] {
    const meta: DatasetMeta[] = [];
    if (!fs.existsSync(DATA_DIR)) return [];

    const domains = fs.readdirSync(DATA_DIR).filter(f => fs.statSync(path.join(DATA_DIR, f)).isDirectory());

    for (const domain of domains) {
        const domainPath = path.join(DATA_DIR, domain);
        const files = fs.readdirSync(domainPath).filter(f => f.endsWith('.csv'));
        
        for (const file of files) {
            const content = fs.readFileSync(path.join(domainPath, file), 'utf-8').trim();
            const lines = content.split('\n');
            const headers = lines[0].split(',').map(h => h.trim());
            const firstRow = lines.length > 1 ? lines[1].split(',').map(v => v.trim()) : [];
            
            const sampleValues: Record<string, string> = {};
            headers.forEach((h, i) => {
                sampleValues[h] = firstRow[i] || '';
            });

            const domainEnum = domain.toUpperCase() as DomainType;
            const semanticMap = buildSemanticColumnMapFromAliases(headers, domainEnum);

            meta.push({
                domain: domain.toUpperCase(),
                filename: file,
                columns: headers,
                sampleValues,
                semanticRolesLocked: Object.keys(semanticMap),
            });
        }
    }
    return meta;
}

async function main() {
    const query = process.argv.slice(2).join(' ');

    console.log("=========================================");
    console.log("🧠 VistaraBI Global Data Brain");
    console.log("=========================================\n");

    const allData = getDatasetMetadata();
    console.log(`📦 Indexed ${allData.length} datasets across 8 domains.`);

    if (!query) {
        console.log("\n💡 Usage: npx tsx scripts/data-brain.ts \"Your question about the data\"");
        console.log("Example: npx tsx scripts/data-brain.ts \"Which domains have revenue data?\"\n");
        return;
    }

    const dataPackageJSON = JSON.stringify(allData, null, 2);

    const prompt = `
I have the following data architecture across my VistaraBI platform:

${dataPackageJSON}

USER QUERY:
"${query}"

TASK:
1. Answer the user query based ONLY on the data structure provided.
2. If you need to suggest a cross-domain join (e.g., ECOMMERCE.customer_id ↔ SAAS.customer_id), explain why.
3. Keep it professional and analytical.
`.trim();

    console.log(`\n🤖 Chanakya is thinking about your query: "${query}"...\n`);

    try {
        const response = await generateCompletion({
            model: 'qwen3.5:0.8b',
            messages: [
                {
                    role: 'system',
                    content: 'You are Chanakya, the Global Data Architect for VistaraBI. You have perfect visibility into the schema of all 8 domains.'
                },
                {
                    role: 'user',
                    content: prompt
                }
            ],
            temperature: 0.2
        });

        console.log("-----------------------------------------");
        console.log(response);
        console.log("-----------------------------------------");

    } catch (e: any) {
        console.error("❌ Data Brain Error: ", e.message);
    }
}

main().catch(console.error);
