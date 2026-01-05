// Column Scanner - Scans all column names against domain keyword libraries

import db from '@/lib/prisma';
import { DomainType, DOMAIN_LIBRARIES, ALL_DOMAINS } from './domain-keywords';

export interface ColumnMatch {
    columnName: string;
    normalizedName: string;
    matchedDomain: DomainType;
    matchedKeyword: string;
    sourceId: string;
    sourceName: string;
}

export interface ScanResult {
    projectId: string;
    totalColumnsScanned: number;
    matchesByDomain: Record<DomainType, ColumnMatch[]>;
    unmatchedColumns: string[];
}

// Normalize column name for matching (lowercase, remove special chars, trim)
function normalizeColumnName(name: string): string {
    return name
        .toLowerCase()
        .replace(/[_\-\s]+/g, '') // Remove underscores, hyphens, spaces
        .trim();
}

// Check if normalized column contains any keyword
function findKeywordMatch(normalizedColumn: string, keywords: string[]): string | null {
    for (const keyword of keywords) {
        const normalizedKeyword = normalizeColumnName(keyword);
        if (normalizedColumn === normalizedKeyword || normalizedColumn.includes(normalizedKeyword)) {
            return keyword;
        }
    }
    return null;
}

export async function scanProjectColumns(projectId: string): Promise<ScanResult> {
    console.log('[DomainScanner] Scanning columns for project:', projectId);

    // Get all sources for the project
    const sources = await db.source.findMany({ where: { projectId } });

    if (sources.length === 0) {
        console.log('[DomainScanner] No sources found for project');
        return {
            projectId,
            totalColumnsScanned: 0,
            matchesByDomain: ALL_DOMAINS.reduce((acc, domain) => ({ ...acc, [domain]: [] }), {} as Record<DomainType, ColumnMatch[]>),
            unmatchedColumns: [],
        };
    }

    const matchesByDomain: Record<DomainType, ColumnMatch[]> = ALL_DOMAINS.reduce(
        (acc, domain) => ({ ...acc, [domain]: [] }),
        {} as Record<DomainType, ColumnMatch[]>
    );
    const unmatchedColumns: string[] = [];
    let totalColumnsScanned = 0;

    // Scan each source
    for (const source of sources) {
        const columns = source.columns || [];
        console.log(`[DomainScanner] Scanning ${columns.length} columns from ${source.fileName}`);

        for (const columnName of columns) {
            totalColumnsScanned++;
            const normalizedName = normalizeColumnName(columnName);
            let matched = false;

            // Check against each domain's keywords
            for (const domain of ALL_DOMAINS) {
                const keywords = DOMAIN_LIBRARIES[domain].keywords;
                const matchedKeyword = findKeywordMatch(normalizedName, keywords);

                if (matchedKeyword) {
                    matchesByDomain[domain].push({
                        columnName,
                        normalizedName,
                        matchedDomain: domain,
                        matchedKeyword,
                        sourceId: source.id,
                        sourceName: source.fileName,
                    });
                    matched = true;
                    // Don't break - column might match multiple domains
                }
            }

            if (!matched) {
                unmatchedColumns.push(columnName);
            }
        }
    }

    console.log(`[DomainScanner] Scanned ${totalColumnsScanned} columns, found matches in ${ALL_DOMAINS.filter(d => matchesByDomain[d].length > 0).length
        } domains`);

    return {
        projectId,
        totalColumnsScanned,
        matchesByDomain,
        unmatchedColumns,
    };
}
