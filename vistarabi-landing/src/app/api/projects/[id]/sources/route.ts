import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { parseFile, getFileType } from '@/lib/parsers';
import { runFullAnalysis } from '@/lib/intelligence';
import { purifyDataset } from '@/lib/purification';
import { checkRateLimit, getIdentifier, RATE_LIMITS, buildRateLimitHeaders } from '@/lib/security/rate-limiter';

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB
const ALLOWED_EXTENSIONS = ['csv', 'json', 'xml', 'xlsx'];

// GET /api/projects/[id]/sources - List sources for a project
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
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

        return NextResponse.json({ sources: sourcesWithoutData });
    } catch (error) {
        console.error('Get sources error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
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
            return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
        }

        const { id } = await params;
        const project = await db.project.findUnique({ where: { id } });

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.userId !== user.userId) {
            return NextResponse.json({ error: 'Access denied' }, { status: 403 });
        }

        // ─── Rate Limiting ───
        const rl = checkRateLimit(getIdentifier(request, user.userId, 'upload'), RATE_LIMITS.UPLOAD);
        const rlHeaders = buildRateLimitHeaders(rl);
        if (!rl.success) {
            return NextResponse.json(
                { error: 'Upload rate limit exceeded. Please wait a minute.' },
                { status: 429, headers: rlHeaders }
            );
        }

        let formData;
        let files: File[];
        
        try {
            formData = await request.formData();
            files = formData.getAll('files') as File[];
        } catch (formDataError: any) {
            console.error('FormData parsing error:', formDataError);
            
            // Handle body size limit errors
            if (formDataError?.message?.includes('Request body exceeded') || 
                formDataError?.message?.includes('Failed to parse')) {
                return NextResponse.json(
                    { 
                        error: 'File upload too large. Maximum size is 100MB.',
                        hint: 'Please reduce file size or split into smaller batches.'
                    },
                    { status: 413, headers: rlHeaders }
                );
            }
            
            throw formDataError;
        }

        if (files.length === 0) {
            return NextResponse.json({ error: 'No files provided' }, { status: 400, headers: rlHeaders });
        }

        const results = [];

        for (const file of files) {
            const fileName = file.name;
            const fileType = getFileType(fileName);

            // ─── Security Validations ───
            // 1. File size check
            if (file.size > MAX_FILE_SIZE) {
                results.push({ fileName, status: 'FAILED', error: 'File size exceeds 50MB limit' });
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
                    content = await file.text();
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
                        data: parseResult.data as any,
                    },
                }))!;

                // Run intelligence analysis (column types, stats, relationships)
                await runFullAnalysis(source.id);

                // Run data purification (cleaning pipeline)
                await purifyDataset(source.id);

                // Fetch updated source with quality score
                const updatedSource = await db.source.findUnique({ where: { id: source.id } });

                results.push({
                    id: source.id,
                    fileName: source.fileName,
                    status: source.status,
                    rowCount: source.rowCount,
                    colCount: source.colCount,
                    qualityScore: updatedSource?.qualityScore,
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

        return NextResponse.json({ sources: results }, { status: 201, headers: rlHeaders });
    } catch (error) {
        console.error('Upload sources error:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
