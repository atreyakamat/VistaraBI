// Main parser dispatcher

import { parseCSV, ParseResult } from './csv';
import { parseXLSX } from './xlsx';
import { parseJSON } from './json';
import { parseXML } from './xml';

export type { ParseResult };

export type SupportedFileType = 'csv' | 'xlsx' | 'xls' | 'json' | 'xml';

export function getFileType(fileName: string): SupportedFileType | null {
    const ext = fileName.split('.').pop()?.toLowerCase();

    switch (ext) {
        case 'csv':
            return 'csv';
        case 'xlsx':
        case 'xls':
            return 'xlsx';
        case 'json':
            return 'json';
        case 'xml':
            return 'xml';
        default:
            return null;
    }
}

export async function parseFile(
    fileName: string,
    content: string | ArrayBuffer
): Promise<ParseResult> {
    const fileType = getFileType(fileName);

    if (!fileType) {
        throw new Error(`Unsupported file type: ${fileName}`);
    }

    switch (fileType) {
        case 'csv':
            if (typeof content !== 'string') {
                throw new Error('CSV content must be a string');
            }
            return parseCSV(content);

        case 'xlsx':
            if (typeof content === 'string') {
                throw new Error('Excel content must be an ArrayBuffer');
            }
            return parseXLSX(content);

        case 'json':
            if (typeof content !== 'string') {
                throw new Error('JSON content must be a string');
            }
            return parseJSON(content);

        case 'xml':
            if (typeof content !== 'string') {
                throw new Error('XML content must be a string');
            }
            return parseXML(content);

        default:
            throw new Error(`Parser not implemented for: ${fileType}`);
    }
}
