import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { executeKPI } from '../src/lib/execution/kpi-executor';
import { getAllKPIs } from '../src/lib/kpi/kpi-library';

const prisma = new PrismaClient();
const DOMAINS = ['ECOMMERCE', 'EDTECH', 'FINANCE', 'HEALTHCARE', 'MANUFACTURING', 'RETAIL', 'SAAS', 'SERVICES'];

async function sampleCSV(filePath: string, numLines: number): Promise<string> {
    const stream = fs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 64 * 1024 });
    let content = '';
    let lines = 0;
    for await (const chunk of stream) {
        content += chunk;
        lines = (content.match(/\n/g) || []).length;
        if (lines >= numLines) break;
    }
    const idx = content.split('\n', numLines).join('\n').length;
    return content.substring(0, idx);
}

async function run() {
    console.log("Starting demo account setup...");
    
    const hash = await bcrypt.hash('password123', 12);
    const user = await prisma.user.upsert({
        where: { email: 'demo@vistara.com' },
        update: { password: hash },
        create: {
            email: 'demo@vistara.com',
            name: 'Demo User',
            password: hash
        }
    });
    console.log(`User created: demo@vistara.com / password123`);

    for (const domain of DOMAINS) {
        console.log(`\n=== Processing Domain: ${domain} ===`);
        const folderName = domain.toLowerCase();
        const datasetsPath = path.join(process.cwd(), '..', 'waste', 'extra_stuff', 'landing_datasets', 'demo');
        
        let mainCsvName = `${folderName}_demo.csv`;
        let csvPath = path.join(datasetsPath, mainCsvName);
        
        if (!fs.existsSync(csvPath)) {
            console.log(`Demo CSV not found: ${csvPath}, trying full dataset...`);
            const fullPath = path.join(process.cwd(), '..', 'waste', 'extra_stuff', 'landing_datasets', folderName);
            if (!fs.existsSync(fullPath)) {
                console.log(`Full dataset folder not found either.`);
                continue;
            }
            const files = fs.readdirSync(fullPath).filter(f => f.endsWith('.csv'));
            if (files.length === 0) continue;
            mainCsvName = files.find(f => f.includes('transactions') || f.includes(folderName)) || files[0];
            csvPath = path.join(fullPath, mainCsvName);
        }

        console.log(`Using dataset: ${csvPath}`);
        const csvContent = await sampleCSV(csvPath, 5000);
        const parsed = Papa.parse(csvContent, { header: true, dynamicTyping: true, skipEmptyLines: true });
        const columns = Object.keys(parsed.data[0] || {});
        
        if (columns.length === 0) {
            console.log(`Failed to parse columns`);
            continue;
        }

        // Clean previous project with same name if it exists to avoid duplicates
        const existingProject = await prisma.project.findFirst({
            where: { name: `Demo ${domain}`, userId: user.id }
        });
        if (existingProject) {
            await prisma.project.delete({ where: { id: existingProject.id } });
            console.log(`Deleted existing project for ${domain}`);
        }

        const project = await prisma.project.create({
            data: {
                name: `Demo ${domain}`,
                userId: user.id
            }
        });

        await prisma.domainDetection.create({
            data: {
                projectId: project.id,
                detectedDomain: domain,
                confidence: 0.99,
                status: 'AUTO_ASSIGNED',
                scoringBreakdown: {},
                explanation: 'Demo auto-assigned'
            }
        });

        await prisma.source.create({
            data: {
                projectId: project.id,
                fileName: mainCsvName,
                fileType: 'CSV',
                columns: columns,
                data: parsed.data as any
            }
        });

        const blueprint = await prisma.kPIBlueprint.create({
            data: {
                projectId: project.id,
                domain: domain,
                isLocked: true
            }
        });

        const allKpis = getAllKPIs(domain as any);
        console.log(`Approving ${allKpis.length} KPIs for ${domain}...`);

        for (const kpi of allKpis) {
            await prisma.approvedKPI.create({
                data: {
                    blueprintId: blueprint.id,
                    kpiLibraryId: kpi.id,
                    name: kpi.name,
                    description: kpi.description || '',
                    category: kpi.category || 'general',
                    sourceTable: 'merged_data',
                    aggregations: {
                        create: (kpi.aggregationRules || []).map((r: any) => ({ function: r.function, column: r.column }))
                    }
                }
            });
        }
        
        // Execute the KPIs
        console.log(`Executing ${allKpis.length} KPIs for ${domain}...`);
        for (const kpi of allKpis) {
            try {
                await executeKPI(project.id, kpi.id, { granularity: 'monthly' });
            } catch (err: any) {
                console.log(`Error executing ${kpi.name}: ${err.message}`);
            }
        }
        console.log(`Finished ${domain}`);
    }
}

run()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
