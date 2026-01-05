// Excel (XLSX) Parser using SheetJS

import * as XLSX from 'xlsx';
import { ParseResult } from './csv';

export async function parseXLSX(buffer: ArrayBuffer): Promise<ParseResult> {
    try {
        const workbook = XLSX.read(buffer, { type: 'array' });

        // Get first sheet
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
            throw new Error('No sheets found in workbook');
        }

        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON with headers
        const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
            defval: '',
        });

        // Extract columns from first row or range
        const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        const columns: string[] = [];

        for (let col = range.s.c; col <= range.e.c; col++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: col });
            const cell = worksheet[cellAddress];
            columns.push(cell ? String(cell.v) : `Column${col + 1}`);
        }

        return {
            columns,
            data: jsonData,
            rowCount: jsonData.length,
            colCount: columns.length,
        };
    } catch (error) {
        throw new Error(`Excel parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
