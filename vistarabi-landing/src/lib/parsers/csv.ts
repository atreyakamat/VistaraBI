// CSV Parser using Papa Parse

import Papa from 'papaparse';

export interface ParseResult {
    columns: string[];
    data: Record<string, unknown>[];
    rowCount: number;
    colCount: number;
}

export async function parseCSV(content: string): Promise<ParseResult> {
    // 1. Fast, memory-efficient total row count (count newlines)
    // We do this manually to avoid allocating 1,000,000 objects just to know the length
    let totalRows = 0;
    for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n') {
            totalRows++;
        }
    }
    // Adjust for header and possible trailing empty line
    if (totalRows > 0) totalRows--;
    if (content.endsWith('\n\n') || content.endsWith('\r\n\r\n')) totalRows--;
    
    // Ensure totalRows is at least the sample size if the count is wonky
    totalRows = Math.max(0, totalRows);

    // 2. Parse only the first 5,000 rows for the Prisma JSON payload.
    // This allows the app to feel like it handles massive datasets seamlessly
    // while protecting V8 and the DB from memory exhaustion (OOM).
    const MAX_SAMPLE_ROWS = 5000;

    return new Promise((resolve, reject) => {
        Papa.parse(content, {
            header: true,
            skipEmptyLines: true,
            preview: MAX_SAMPLE_ROWS,
            complete: (results) => {
                const columns = results.meta.fields || [];
                const data = results.data as Record<string, unknown>[];

                // If the file is smaller than the preview limit, use accurate count
                const finalRowCount = data.length < MAX_SAMPLE_ROWS ? data.length : Math.max(totalRows, data.length);

                resolve({
                    columns,
                    data,
                    rowCount: finalRowCount,
                    colCount: columns.length,
                });
            },
            error: (error: Error) => {
                reject(new Error(`CSV parsing failed: ${error.message}`));
            },
        });
    });
}
