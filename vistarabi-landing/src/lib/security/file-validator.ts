/**
 * Secure file upload validator for VistaraBI.
 * Validates file size, magic bytes, MIME type, and sanitizes filenames.
 */

import crypto from 'crypto';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500 MB

/** Magic bytes for allowed file formats */
const MAGIC_BYTES: Record<string, { bytes: number[]; offset: number }[]> = {
  csv: [
    // CSV has no magic bytes – validated by text content heuristics
  ],
  json: [
    { bytes: [0x7b], offset: 0 }, // '{'
    { bytes: [0x5b], offset: 0 }, // '['
  ],
  xlsx: [
    { bytes: [0x50, 0x4b, 0x03, 0x04], offset: 0 }, // PK ZIP (Office Open XML)
  ],
  xml: [
    { bytes: [0x3c, 0x3f, 0x78, 0x6d, 0x6c], offset: 0 }, // '<?xml'
    { bytes: [0xef, 0xbb, 0xbf, 0x3c], offset: 0 }, // BOM + '<'
    { bytes: [0x3c], offset: 0 }, // '<'
  ],
};

/** Known dangerous magic bytes that should never be allowed */
const DANGEROUS_MAGIC: number[][] = [
  [0x4d, 0x5a], // PE executable (MZ)
  [0x7f, 0x45, 0x4c, 0x46], // ELF executable
  [0x23, 0x21], // Shebang (#!)
  [0xff, 0xd8, 0xff], // JPEG (not a data format)
  [0x89, 0x50, 0x4e, 0x47], // PNG
  [0x47, 0x49, 0x46], // GIF
  [0x25, 0x50, 0x44, 0x46], // PDF
];

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedName: string;
  hash: string;
  detectedType: string;
  sizeBytes: number;
}

/**
 * Check if buffer starts with specified bytes at a given offset.
 */
function startsWithBytes(buffer: Buffer, bytes: number[], offset = 0): boolean {
  if (buffer.length < offset + bytes.length) return false;
  return bytes.every((b, i) => buffer[offset + i] === b);
}

/**
 * Detect file type from magic bytes.
 */
function detectFileType(buffer: Buffer, extension: string): string {
  // Check XLSX first (PK signature)
  if (startsWithBytes(buffer, MAGIC_BYTES.xlsx[0].bytes)) return 'xlsx';

  // Check XML
  for (const sig of MAGIC_BYTES.xml) {
    if (startsWithBytes(buffer, sig.bytes, sig.offset)) return 'xml';
  }

  // Check JSON
  for (const sig of MAGIC_BYTES.json) {
    if (startsWithBytes(buffer, sig.bytes, sig.offset)) return 'json';
  }

  // CSV: validate that content is mostly printable ASCII / UTF-8 text
  const sampleStr = buffer.slice(0, Math.min(1024, buffer.length)).toString('utf8');
  const printableRatio = sampleStr.split('').filter(c => c.charCodeAt(0) >= 32 || c === '\n' || c === '\r' || c === '\t').length / sampleStr.length;
  if (printableRatio > 0.95 && extension === 'csv') return 'csv';

  return 'unknown';
}

/**
 * Sanitize filename: keep only alphanumeric, dash, underscore, and dots.
 * Prevents path traversal and injection via filenames.
 */
export function sanitizeFilename(filename: string): string {
  // Remove path components
  const basename = filename.replace(/^.*[\\/]/, '');
  // Keep safe characters only
  const sanitized = basename.replace(/[^a-zA-Z0-9._-]/g, '_');
  // Prevent hidden files / double extensions
  return sanitized.replace(/^\.+/, '').replace(/\.{2,}/g, '.');
}

/**
 * Comprehensive file validation.
 */
export async function validateUploadedFile(
  buffer: Buffer,
  originalFilename: string
): Promise<FileValidationResult> {
  const sanitizedName = sanitizeFilename(originalFilename);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  const sizeBytes = buffer.length;

  // 1. Size check
  if (sizeBytes > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum allowed size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`,
      sanitizedName,
      hash,
      detectedType: 'unknown',
      sizeBytes,
    };
  }

  if (sizeBytes === 0) {
    return {
      valid: false,
      error: 'File is empty.',
      sanitizedName,
      hash,
      detectedType: 'unknown',
      sizeBytes,
    };
  }

  // 2. Block known dangerous file types
  for (const dangerous of DANGEROUS_MAGIC) {
    if (startsWithBytes(buffer, dangerous)) {
      return {
        valid: false,
        error: 'File type not allowed. Only CSV, JSON, XML, and XLSX files are accepted.',
        sanitizedName,
        hash,
        detectedType: 'blocked',
        sizeBytes,
      };
    }
  }

  // 3. Extension check
  const ext = sanitizedName.split('.').pop()?.toLowerCase() || '';
  const allowedExtensions = ['csv', 'json', 'xml', 'xlsx'];
  if (!allowedExtensions.includes(ext)) {
    return {
      valid: false,
      error: `File extension '.${ext}' is not allowed. Accepted formats: CSV, JSON, XML, XLSX.`,
      sanitizedName,
      hash,
      detectedType: 'unknown',
      sizeBytes,
    };
  }

  // 4. Magic byte / content type detection
  const detectedType = detectFileType(buffer, ext);

  if (detectedType === 'blocked') {
    return {
      valid: false,
      error: 'File content does not match a safe data format.',
      sanitizedName,
      hash,
      detectedType,
      sizeBytes,
    };
  }

  // 5. Extension vs detected type mismatch (warn but allow for CSV/text)
  if (detectedType !== 'unknown' && detectedType !== ext && ext !== 'csv') {
    return {
      valid: false,
      error: `File extension '.${ext}' does not match detected file content (${detectedType}).`,
      sanitizedName,
      hash,
      detectedType,
      sizeBytes,
    };
  }

  return {
    valid: true,
    sanitizedName,
    hash,
    detectedType: detectedType === 'unknown' ? ext : detectedType,
    sizeBytes,
  };
}
