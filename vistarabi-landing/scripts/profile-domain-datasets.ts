import fs from 'fs';
import path from 'path';
import {
    buildDomainFeatureCatalog,
    discoverCsvFilesRecursive,
    writeDomainFeatureCatalog,
} from './lib/dataset-feature-catalog';

const DATASETS_ROOT = path.resolve(__dirname, '../datasets');
const CLEAN_DATA_ROOT = path.resolve(__dirname, '../dummy-data/clean');

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

function resolveCatalogSourceRoot(domain: DomainName): string {
    const primaryDir = path.join(DATASETS_ROOT, domain.toLowerCase());
    const fallbackDir = path.join(CLEAN_DATA_ROOT, domain.toLowerCase());

    const primaryFiles = discoverCsvFilesRecursive(primaryDir);
    if (primaryFiles.length > 0) {
        return primaryDir;
    }

    if (fs.existsSync(fallbackDir) && discoverCsvFilesRecursive(fallbackDir).length > 0) {
        return fallbackDir;
    }

    throw new Error(`No CSV files found for domain ${domain} in datasets/ or dummy-data/clean.`);
}

function printUsageAndExit(): never {
    console.log('Usage: npx tsx scripts/profile-domain-datasets.ts <DOMAIN>');
    console.log(`Domains: ${ALL_DOMAINS.join(', ')}`);
    process.exit(1);
}

async function main(): Promise<void> {
    const rawDomainArg = process.argv[2]?.toUpperCase();
    if (!rawDomainArg) {
        printUsageAndExit();
    }

    if (!ALL_DOMAINS.includes(rawDomainArg as DomainName)) {
        console.error(`❌ Invalid domain "${rawDomainArg}".`);
        printUsageAndExit();
    }

    const domain = rawDomainArg as DomainName;
    const sourceRoot = resolveCatalogSourceRoot(domain);
    const catalog = buildDomainFeatureCatalog(domain, sourceRoot);

    const outputPath = path.join(DATASETS_ROOT, domain.toLowerCase(), `${domain.toLowerCase()}-feature-catalog.json`);
    writeDomainFeatureCatalog(catalog, outputPath);

    console.log(`📂 Domain: ${domain}`);
    console.log(`📌 Source Root: ${sourceRoot}`);
    console.log(`🧮 CSV Files: ${catalog.totalCsvFiles}`);
    console.log(`🧭 Catalog Output: ${outputPath}`);
    console.log('');

    for (const dataset of catalog.datasets) {
        const joins = dataset.idColumns.length > 0 ? dataset.idColumns.join(', ') : 'none';
        const dates = dataset.dateColumns.length > 0 ? dataset.dateColumns.join(', ') : 'none';
        const metrics = dataset.metricColumns.length > 0 ? dataset.metricColumns.slice(0, 6).join(', ') : 'none';
        console.log(`- ${dataset.relativePath}`);
        console.log(`  rows=${dataset.rowCount}, cols=${dataset.columnCount}`);
        console.log(`  join_keys: ${joins}`);
        console.log(`  date_columns: ${dates}`);
        console.log(`  metric_columns: ${metrics}`);
    }

    console.log('');
    console.log('🔎 Important feature signals:');
    if (catalog.importantFeatureSignals.length === 0) {
        console.log('- none');
    } else {
        for (const signal of catalog.importantFeatureSignals) {
            console.log(`- ${signal}`);
        }
    }
}

main().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Failed to build domain feature catalog: ${message}`);
    process.exit(1);
});

