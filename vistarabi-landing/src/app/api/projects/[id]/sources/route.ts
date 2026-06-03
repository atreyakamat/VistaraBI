import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { parseFile, getFileType } from '@/lib/parsers';
import { runFullAnalysis } from '@/lib/intelligence';
import { purifyDataset } from '@/lib/purification';
import { checkRateLimit, getIdentifier, RATE_LIMITS, buildRateLimitHeaders } from '@/lib/security/rate-limiter';
import { apiError, apiSuccess } from '@/lib/api-response';
import type { Prisma } from '@prisma/client';
import { checkFileUploadLimit } from '@/lib/plan-limits';

const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB
const ALLOWED_EXTENSIONS = ['csv', 'xlsx', 'xls', 'json', 'xml'];

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return apiError('UNAUTHORIZED', 'Not authenticated');
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return apiError('NOT_FOUND', 'Project not found');
        }

        if (project.userId !== user.userId) {
            return apiError('FORBIDDEN', 'Access denied');
        }

        const sources = await db.source.findMany({
            where: { projectId: id },
        });

        // Return sources without full data (just metadata)
        const sourcesWithoutData = sources.map(s => ({
            id: s.id,
            fileName: s.fileName,
            fileType: s.fileType,
            status: s.status,
            rowCount: s.rowCount,
            colCount: s.colCount,
            columns: s.columns,
            qualityScore: s.qualityScore,
            error: s.error,
            uploadedAt: s.uploadedAt,
        }));

        return apiSuccess({ sources: sourcesWithoutData });
    } catch (error) {
        console.error('Get sources error:', error);
        return apiError('INTERNAL_ERROR', 'Failed to fetch sources');
    }
}

// POST /api/projects/[id]/sources - Upload and parse file(s)
export async function POST(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return apiError('UNAUTHORIZED', 'Not authenticated');
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return apiError('NOT_FOUND', 'Project not found');
        }

        if (project.userId !== user.userId) {
            return apiError('FORBIDDEN', 'Access denied');
        }

        // ─── Rate Limiting ───
        const rl = checkRateLimit(getIdentifier(request, user.userId, 'upload'), RATE_LIMITS.UPLOAD);
        const rlHeaders = buildRateLimitHeaders(rl);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Upload rate limit exceeded. Please wait a minute.', code: 'RATE_LIMITED' },
                { status: 429, headers: rlHeaders }
            );
        }

        let formData;
        let files: File[];
        let preferLocal: boolean = true;
        
        try {
            formData = await request.formData();
            files = formData.getAll('files') as File[];
            preferLocal = formData.get('preferLocal') === 'true';
        } catch (formDataError: unknown) {
            console.error('FormData parsing error:', formDataError);
            const message = formDataError instanceof Error ? formDataError.message : String(formDataError);
            
            // Handle body size limit errors
            if (message.includes('Request body exceeded') ||
                message.includes('Failed to parse')) {
                return apiError('FILE_TOO_LARGE', 'File upload too large. Maximum size is 50MB.', 413, {
                    hint: 'Please reduce file size or split into smaller batches.'
                });
            }
            
            throw formDataError;
        }

        if (files.length === 0) {
            return apiError('VALIDATION_ERROR', 'No files provided');
        }

        const results = [];

        for (const file of files) {
            const fileName = file.name;
            const fileType = getFileType(fileName);

            // ─── Security Validations ───
            // 1. File size check
            const fileSizeMb = file.size / (1024 * 1024);
            const sizeLimitCheck = await checkFileUploadLimit(user.userId, fileSizeMb);
            if (!sizeLimitCheck.allowed) {
                results.push({ fileName, status: 'FAILED', error: sizeLimitCheck.message || `File size exceeds ${MAX_FILE_SIZE / (1024 * 1024)}MB limit` });
                continue;
            }

            // 2. Extension check
            if (!fileType || !ALLOWED_EXTENSIONS.includes(fileType)) {
                results.push({ fileName, status: 'FAILED', error: `Unsupported file type. Allowed: ${ALLOWED_EXTENSIONS.join(', ')}` });
                continue;
            }

            // Create source record with PROCESSING status
            let source = await db.source.create({
                data: {
                    projectId: id,
                    fileName,
                    fileType: fileType,
                    status: 'PROCESSING',
                    rowCount: 0,
                    colCount: 0,
                    columns: [],
                    data: [],
                    uploadedAt: new Date(),
                },
            });

            try {
                // Read file content
                let content: string | ArrayBuffer;
                if (fileType === 'xlsx') {
                    content = await file.arrayBuffer();
                } else {
                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    
                    // UTF-16 BOM detection
                    if (buffer.length >= 2 && buffer[0] === 0xFF && buffer[1] === 0xFE) {
                        content = buffer.toString('utf16le');
                    } else if (buffer.length >= 2 && buffer[0] === 0xFE && buffer[1] === 0xFF) {
                        // UTF-16 BE BOM: swap bytes for Node.js UTF-16LE conversion
                        const swapped = Buffer.alloc(buffer.length);
                        for (let i = 0; i < buffer.length - 1; i += 2) {
                            swapped[i] = buffer[i + 1];
                            swapped[i + 1] = buffer[i];
                        }
                        content = swapped.toString('utf16le');
                    } else {
                        content = buffer.toString('utf8');
                    }
                }

                // Parse file
                const parseResult = await parseFile(fileName, content);

                // Update source with parsed data
                source = (await db.source.update({
                    where: { id: source.id },
                    data: {
                        status: 'READY',
                        rowCount: parseResult.rowCount,
                        colCount: parseResult.colCount,
                        columns: parseResult.columns,
                        data: parseResult.data as Prisma.InputJsonValue,
                    },
                }))!;

                // Run intelligence analysis (column types, stats, relationships)
                await runFullAnalysis(source.id, preferLocal);

                // Run data purification (cleaning pipeline)
                await purifyDataset(source.id);

                // Fetch updated source with quality score
                const updatedSource = await db.source.findUnique({ where: { id: source.id } });

                // Fetch cleaning stats for the response
                let cleaningStats = null;
                try {
                    const cleaningLog = await db.cleaningLog.findUnique({ where: { sourceId: source.id } });
                    if (cleaningLog) {
                        cleaningStats = {
                            nullsFilled: cleaningLog.nullsFilled,
                            duplicatesRemoved: cleaningLog.duplicatesRemoved,
                            datesNormalized: cleaningLog.datesNormalized,
                            currenciesNormalized: cleaningLog.currenciesNormalized,
                            textsStandardized: cleaningLog.textsStandardized,
                            emptyColumnsRemoved: cleaningLog.emptyColumnsRemoved,
                            originalRowCount: cleaningLog.originalRowCount,
                            cleanedRowCount: cleaningLog.cleanedRowCount,
                        };
                    }
                } catch { /* silent */ }

                results.push({
                    id: source.id,
                    fileName: source.fileName,
                    status: source.status,
                    rowCount: source.rowCount,
                    colCount: source.colCount,
                    qualityScore: updatedSource?.qualityScore,
                    cleaningStats,
                });
            } catch (error) {
                // Update source with error
                source = (await db.source.update({
                    where: { id: source.id },
                    data: {
                        status: 'FAILED',
                        error: error instanceof Error ? error.message : 'Unknown error',
                    },
                }))!;

                results.push({
                    id: source.id,
                    fileName: source.fileName,
                    status: source.status,
                    error: source.error,
                });
            }
        }

        return apiSuccess({ sources: results }, 201);
    } catch (error) {
        console.error('Upload sources error:', error);
        return apiError('INTERNAL_ERROR', 'Upload processing failed');
    }
}
