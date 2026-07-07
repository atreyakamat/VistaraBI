import fs from 'fs';
import path from 'path';
import db from '../src/lib/prisma';
import { parseFile } from '../src/lib/parsers';
import { runFullAnalysis } from '../src/lib/intelligence';
import { purifyDataset } from '../src/lib/purification';

const DOMAIN = 'retail';
const DATASETS_DIR = path.resolve(__dirname, `../test-datasets/${DOMAIN}`);

async function main() {
    console.log(`🚀 Starting Continuous Ingestion Test for ${DOMAIN.toUpperCase()}`);

    // 1. Create a dummy test user and project
    const testUser = await db.user.upsert({
        where: { email: 'test-ingestion@vistarabi.com' },
        update: {},
        create: {
            email: 'test-ingestion@vistarabi.com',
            name: 'Ingestion Tester',
            password: 'dummy',
        }
    });

    const project = await db.project.create({
        data: {
            userId: testUser.id,
            name: `Test Project - ${DOMAIN} - ${Date.now()}`,
            description: 'Automated ingestion test project',
        }
    });

    console.log(`✅ Created test project: ${project.id}`);

    // 2. Read the 5 datasets
    const files = fs.readdirSync(DATASETS_DIR).filter(f => f.endsWith('.csv'));
    
    if (files.length === 0) {
        console.error(`❌ No CSV files found in ${DATASETS_DIR}`);
        process.exit(1);
    }

    // 3. Process each file continuously
    for (const fileName of files) {
        console.log(`\n⏳ Ingesting ${fileName}...`);
        const filePath = path.join(DATASETS_DIR, fileName);
        
        try {
            // Read file (might be huge, so we track memory)
            const stats = fs.statSync(filePath);
            console.log(`   - Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
            
            const content = fs.readFileSync(filePath, 'utf8');
            console.log(`   - Loaded into memory`);

            // Create source record
            let source = await db.source.create({
                data: {
                    projectId: project.id,
                    fileName,
                    fileType: 'csv',
                    status: 'PROCESSING',
                    rowCount: 0,
                    colCount: 0,
                    columns: [],
                    data: [],
                }
            });

            // Parse file
            console.log(`   - Parsing CSV...`);
            const parseResult = await parseFile(fileName, content);
            console.log(`   - Parsed: ${parseResult.rowCount} rows, ${parseResult.colCount} cols`);

            // Update source
            source = await db.source.update({
                where: { id: source.id },
                data: {
                    status: 'READY',
                    rowCount: parseResult.rowCount,
                    colCount: parseResult.colCount,
                    columns: parseResult.columns,
                    data: parseResult.data as any,
                }
            });

            // Intelligence Analysis
            console.log(`   - Running full analysis...`);
            await runFullAnalysis(source.id, true);

            // Data Purification
            console.log(`   - Running purification...`);
            await purifyDataset(source.id);

            // Final state
            const finalSource = await db.source.findUnique({ where: { id: source.id } });
            console.log(`✅ Completed ${fileName}. Quality Score: ${finalSource?.qualityScore}`);

        } catch (error: any) {
            console.error(`❌ Error ingesting ${fileName}:`, error.message);
            // Optionally continue to the next file or break
        }
    }

    console.log(`\n🎉 Ingestion test completed for project ${project.id}`);
}

main()
    .catch(console.error)
    .finally(() => db.$disconnect());
