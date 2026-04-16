import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

const PREVIEW_ROW_LIMIT = 500;
const SAMPLE_VALUES_PER_COLUMN = 5;
const MIN_NUMERIC_RATIO = 0.7;
const MIN_DATE_RATIO = 0.6;

const ID_COLUMN_PATTERN = /(^|_)(id|uuid|sku|barcode|invoice_id|order_id|customer_id|product_id|store_id|branch_id|campaign_id|partner_id)($|_)/i;
const DATE_COLUMN_PATTERN = /(^|_)(date|time|timestamp|datetime|created|updated|registration)($|_)/i;
const METRIC_COLUMN_PATTERN = /(sales|revenue|amount|price|cost|margin|inventory|stock|quantity|orders|spend|clicks|conversions|roas|rating|delivery|profit)/i;

const FEATURE_GROUPS: Array<{ label: string; pattern: RegExp }> = [
    { label: 'Sales and revenue flow', pattern: /(sales|revenue|order_total|amount|unit_price|price|mrp|profit|margin)/i },
    { label: 'Customer and experience signals', pattern: /(customer|segment|rating|feedback|sentiment|registration)/i },
    { label: 'Inventory and stock health', pattern: /(inventory|stock|shelf|damaged|shrinkage|received|reorder)/i },
    { label: 'Delivery and fulfillment performance', pattern: /(delivery|promised|actual|distance|delay|time_minutes|status)/i },
    { label: 'Marketing funnel performance', pattern: /(campaign|channel|impressions|clicks|conversions|spend|roas)/i },
];

export interface DatasetFeatureProfile {
    relativePath: string;
    tableName: string;
    rowCount: number;
    columnCount: number;
    columns: string[];
    idColumns: string[];
    dateColumns: string[];
    numericColumns: string[];
    metricColumns: string[];
    sampleValues: Record<string, string[]>;
}

export interface DomainFeatureCatalog {
    domain: string;
    sourceRoot: string;
    generatedAt: string;
    totalCsvFiles: number;
    datasets: DatasetFeatureProfile[];
    commonColumns: string[];
    crossDatasetJoinKeys: string[];
    importantFeatureSignals: string[];
}

function normalizeColumnName(column: string): string {
    return column
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .replace(/^_+|_+$/g, '');
}

const MAX_READ_SIZE = 1024 * 1024; // 1MB is enough for headers and samples

function readPreviewContent(filePath: string): string {
    const stats = fs.statSync(filePath);
    const readSize = Math.min(stats.size, MAX_READ_SIZE);
    const buffer = Buffer.alloc(readSize);
    const fd = fs.openSync(filePath, 'r');
    fs.readSync(fd, buffer, 0, readSize, 0);
    fs.closeSync(fd);

    const utf8 = buffer.toString('utf8');
    const content = utf8.startsWith('\uFEFF') ? utf8.slice(1) : utf8;
    return content;
}

function countDataRows(filePath: string): number {
    const stats = fs.statSync(filePath);
    if (stats.size < MAX_READ_SIZE) {
        const content = fs.readFileSync(filePath, 'utf8');
        const nonEmptyLines = content.split(/\r?\n/).filter((line) => line.trim().length > 0);
        return Math.max(0, nonEmptyLines.length - 1);
    }
    
    // For large files, estimate based on a chunk
    const chunk = readPreviewContent(filePath);
    const lines = chunk.split(/\r?\n/);
    if (lines.length < 5) return 0;
    
    const avgLineLength = chunk.length / lines.length;
    return Math.floor(stats.size / avgLineLength);
}

function parsePreview(content: string): { columns: string[]; rows: Array<Record<string, unknown>> } {
    const parsed = Papa.parse<Record<string, unknown>>(content, {
        header: true,
        skipEmptyLines: 'greedy',
        preview: PREVIEW_ROW_LIMIT,
    });

    const columns = (parsed.meta.fields ?? [])
        .map((field) => field.trim())
        .filter(Boolean);

    const rows = parsed.data.filter((row) => typeof row === 'object' && row !== null);
    return { columns, rows };
}

function toStringValue(value: unknown): string {
    if (value === null || value === undefined) return '';
    if (typeof value === 'string') return value.trim();
    if (typeof value === 'number' || typeof value === 'boolean') return String(value);
    return '';
}

function isLikelyNumeric(raw: string): boolean {
    if (!raw) return false;
    const cleaned = raw.replace(/[$,%\s]/g, '').replace(/,/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.') return false;
    const parsed = Number(cleaned);
    return Number.isFinite(parsed);
}

function isLikelyDate(raw: string): boolean {
    if (!raw) return false;
    const trimmed = raw.trim();
    if (!trimmed) return false;
    if (!/[\/:\-]/.test(trimmed)) return false;
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed);
}

function collectSampleValues(rows: Array<Record<string, unknown>>, column: string): string[] {
    const samples: string[] = [];
    for (const row of rows) {
        const value = toStringValue(row[column]);
        if (!value) continue;
        samples.push(value);
        if (samples.length >= SAMPLE_VALUES_PER_COLUMN) {
            break;
        }
    }
    return samples;
}

function inferColumnBuckets(columns: string[], rows: Array<Record<string, unknown>>): {
    idColumns: string[];
    dateColumns: string[];
    numericColumns: string[];
    metricColumns: string[];
    sampleValues: Record<string, string[]>;
} {
    const idColumns: string[] = [];
    const dateColumns: string[] = [];
    const numericColumns: string[] = [];
    const metricColumns: string[] = [];
    const sampleValues: Record<string, string[]> = {};

    for (const column of columns) {
        const normalized = normalizeColumnName(column);
        const samples = collectSampleValues(rows, column);
        sampleValues[column] = samples;

        if (ID_COLUMN_PATTERN.test(normalized)) {
            idColumns.push(column);
        }
        if (METRIC_COLUMN_PATTERN.test(normalized)) {
            metricColumns.push(column);
        }

        const nonEmptySamples = samples.filter(Boolean);
        if (nonEmptySamples.length === 0) {
            if (DATE_COLUMN_PATTERN.test(normalized)) {
                dateColumns.push(column);
            }
            continue;
        }

        const numericHits = nonEmptySamples.filter(isLikelyNumeric).length;
        const dateHits = nonEmptySamples.filter(isLikelyDate).length;
        const numericRatio = numericHits / nonEmptySamples.length;
        const dateRatio = dateHits / nonEmptySamples.length;

        if (numericRatio >= MIN_NUMERIC_RATIO) {
            numericColumns.push(column);
        }
        if (dateRatio >= MIN_DATE_RATIO || DATE_COLUMN_PATTERN.test(normalized)) {
            dateColumns.push(column);
        }
    }

    return {
        idColumns: Array.from(new Set(idColumns)),
        dateColumns: Array.from(new Set(dateColumns)),
        numericColumns: Array.from(new Set(numericColumns)),
        metricColumns: Array.from(new Set(metricColumns)),
        sampleValues,
    };
}

function buildDatasetProfile(csvPath: string, sourceRoot: string): DatasetFeatureProfile {
    const previewContent = readPreviewContent(csvPath);
    const rowCount = countDataRows(csvPath);
    const { columns, rows } = parsePreview(previewContent);
    const buckets = inferColumnBuckets(columns, rows);
    const relativePath = path.relative(sourceRoot, csvPath).replace(/\\/g, '/');

    return {
        relativePath,
        tableName: path.basename(csvPath, path.extname(csvPath)),
        rowCount,
        columnCount: columns.length,
        columns,
        idColumns: buckets.idColumns,
        dateColumns: buckets.dateColumns,
        numericColumns: buckets.numericColumns,
        metricColumns: buckets.metricColumns,
        sampleValues: buckets.sampleValues,
    };
}

function summarizeFeatureSignals(datasets: DatasetFeatureProfile[]): string[] {
    const summary: string[] = [];

    for (const feature of FEATURE_GROUPS) {
        const matches = datasets
            .map((dataset) => {
                const matchedColumns = dataset.columns.filter((column) =>
                    feature.pattern.test(normalizeColumnName(column))
                );
                return {
                    tableName: dataset.tableName,
                    columns: matchedColumns,
                };
            })
            .filter((entry) => entry.columns.length > 0);

        if (matches.length === 0) continue;

        const compact = matches
            .slice(0, 3)
            .map((entry) => `${entry.tableName}(${entry.columns.slice(0, 3).join(', ')})`)
            .join('; ');

        summary.push(`${feature.label}: ${compact}`);
    }

    return summary;
}

export function discoverCsvFilesRecursive(rootDir: string): string[] {
    if (!fs.existsSync(rootDir)) {
        return [];
    }

    const files: string[] = [];
    const stack: string[] = [rootDir];

    while (stack.length > 0) {
        const currentDir = stack.pop();
        if (!currentDir) continue;

        const entries = fs.readdirSync(currentDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name.startsWith('.')) continue;
            const fullPath = path.join(currentDir, entry.name);
            if (entry.isDirectory()) {
                stack.push(fullPath);
                continue;
            }
            if (entry.isFile() && entry.name.toLowerCase().endsWith('.csv')) {
                files.push(fullPath);
            }
        }
    }

    return files.sort((a, b) => a.localeCompare(b));
}

export function buildDomainFeatureCatalog(domain: string, sourceRoot: string): DomainFeatureCatalog {
    const csvFiles = discoverCsvFilesRecursive(sourceRoot);
    const datasets = csvFiles.map((csvPath) => buildDatasetProfile(csvPath, sourceRoot));

    const commonColumnFrequency = new Map<string, number>();
    const representativeColumnName = new Map<string, string>();
    const joinKeyFrequency = new Map<string, number>();
    const representativeJoinKey = new Map<string, string>();

    for (const dataset of datasets) {
        const seenInDataset = new Set<string>();
        const joinSeenInDataset = new Set<string>();

        for (const column of dataset.columns) {
            const normalized = normalizeColumnName(column);
            if (!normalized || seenInDataset.has(normalized)) continue;
            seenInDataset.add(normalized);
            representativeColumnName.set(normalized, representativeColumnName.get(normalized) ?? column);
            commonColumnFrequency.set(normalized, (commonColumnFrequency.get(normalized) ?? 0) + 1);
        }

        for (const joinColumn of dataset.idColumns) {
            const normalized = normalizeColumnName(joinColumn);
            if (!normalized || joinSeenInDataset.has(normalized)) continue;
            joinSeenInDataset.add(normalized);
            representativeJoinKey.set(normalized, representativeJoinKey.get(normalized) ?? joinColumn);
            joinKeyFrequency.set(normalized, (joinKeyFrequency.get(normalized) ?? 0) + 1);
        }
    }

    const commonColumns = Array.from(commonColumnFrequency.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([normalized]) => representativeColumnName.get(normalized) ?? normalized);

    const crossDatasetJoinKeys = Array.from(joinKeyFrequency.entries())
        .filter(([, count]) => count >= 2)
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([normalized]) => representativeJoinKey.get(normalized) ?? normalized);

    return {
        domain,
        sourceRoot,
        generatedAt: new Date().toISOString(),
        totalCsvFiles: datasets.length,
        datasets,
        commonColumns,
        crossDatasetJoinKeys,
        importantFeatureSignals: summarizeFeatureSignals(datasets),
    };
}

export function writeDomainFeatureCatalog(catalog: DomainFeatureCatalog, outputPath: string): void {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, 'utf8');
}

function formatColumnsForPrompt(columns: string[], maxColumns: number = 18): string {
    if (columns.length <= maxColumns) {
        return columns.join(', ');
    }
    return `${columns.slice(0, maxColumns).join(', ')}, ... (+${columns.length - maxColumns} more)`;
}

export function buildSchemaPromptContext(catalog: DomainFeatureCatalog): string {
    const datasetLines = catalog.datasets
        .map((dataset) => {
            const dateColumns = dataset.dateColumns.length > 0 ? dataset.dateColumns.join(', ') : 'none';
            const numericColumns = dataset.numericColumns.length > 0 ? dataset.numericColumns.join(', ') : 'none';
            const idColumns = dataset.idColumns.length > 0 ? dataset.idColumns.join(', ') : 'none';
            return `- ${dataset.relativePath} (rows=${dataset.rowCount}, cols=${dataset.columnCount})\n` +
                `  columns: ${formatColumnsForPrompt(dataset.columns)}\n` +
                `  join_keys: ${idColumns}\n` +
                `  date_columns: ${dateColumns}\n` +
                `  numeric_columns: ${numericColumns}`;
        })
        .join('\n');

    const commonColumns = catalog.commonColumns.length > 0
        ? catalog.commonColumns.join(', ')
        : 'none';

    const joinKeys = catalog.crossDatasetJoinKeys.length > 0
        ? catalog.crossDatasetJoinKeys.join(', ')
        : 'none';

    const featureSignals = catalog.importantFeatureSignals.length > 0
        ? catalog.importantFeatureSignals.map((signal) => `- ${signal}`).join('\n')
        : '- none';

    return [
        `Dataset count: ${catalog.totalCsvFiles}`,
        `Common columns across datasets: ${commonColumns}`,
        `Cross-dataset join keys: ${joinKeys}`,
        'Datasets:',
        datasetLines || '- none',
        'Important feature signals:',
        featureSignals,
    ].join('\n');
}

