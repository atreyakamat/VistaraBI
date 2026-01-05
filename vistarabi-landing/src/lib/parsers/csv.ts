// CSV Parser using Papa Parse

import Papa from 'papaparse';

export interface ParseResult {
    columns: string[];
    data: Record<string, unknown>[];
    rowCount: number;
    colCount: number;
}

export async function parseCSV(content: string): Promise<ParseResult> {
    return new Promise((resolve, reject) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            complete: (results) => {
                const columns = results.meta.fields || [];
                const data = results.data as Record<string, unknown>[];

                resolve({
                    columns,
                    data,
                    rowCount: data.length,
                    colCount: columns.length,
                });
            },
            error: (error: Error) => {
                reject(new Error(`CSV parsing failed: ${error.message}`));
            },
        });
    });
}
