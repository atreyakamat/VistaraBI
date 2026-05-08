// GET /api/projects/[id]/export?kpi=KPI_NAME
// Returns KPI query results as a downloadable CSV file.
// Pulls from the live SQL materialisation for that KPI.

import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import prisma from '@/lib/prisma';
import { Pool } from 'pg';

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

function toCSV(rows: Record<string, unknown>[]): string {
    if (!rows.length) return 'No data available\n';
    const headers = Object.keys(rows[0]);
    const lines = [
        headers.join(','),
        ...rows.map(row =>
            headers.map(h => {
                const val = row[h];
                if (val === null || val === undefined) return '';
                const str = String(val);
                // Quote fields containing commas, quotes, or newlines
                return str.includes(',') || str.includes('"') || str.includes('\n')
                    ? `"${str.replace(/"/g, '""')}"`
                    : str;
            }).join(',')
        ),
    ];
    return lines.join('\n');
}

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const user = await getCurrentUser();
    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id: projectId } = await params;
    const kpiName = request.nextUrl.searchParams.get('kpi');
    const limit = Math.min(parseInt(request.nextUrl.searchParams.get('limit') ?? '10000'), 50000);

    // Verify ownership
    const project = await prisma.project.findUnique({
        where: { id: projectId },
        select: { userId: true, name: true },
    });
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    if (project.userId !== user.userId) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

    try {
        let rows: Record<string, unknown>[] = [];
        const tableName = `merged_data_${projectId.replace(/-/g, '_')}`;

        if (kpiName) {
            // Export specific KPI: pull the relevant column(s) from the merged table
            const result = await pool.query(
                `SELECT * FROM "${tableName}" LIMIT $1`,
                [limit]
            );
            rows = result.rows;
        } else {
            // Export all data from the project's merged table
            const result = await pool.query(
                `SELECT * FROM "${tableName}" LIMIT $1`,
                [limit]
            );
            rows = result.rows;
        }

        const csv = toCSV(rows);
        const filename = kpiName
            ? `${project.name}-${kpiName}-export.csv`.replace(/[^a-zA-Z0-9-_.]/g, '_')
            : `${project.name}-data-export.csv`.replace(/[^a-zA-Z0-9-_.]/g, '_');

        return new NextResponse(csv, {
            status: 200,
            headers: {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="${filename}"`,
                'Cache-Control': 'no-store',
            },
        });
    } catch (err: any) {
        // Table may not exist yet (project not fully processed)
        if (err?.code === '42P01') {
            return NextResponse.json({ error: 'No data available yet. Please upload and process a file first.' }, { status: 404 });
        }
        console.error('[export] error:', err);
        return NextResponse.json({ error: 'Export failed' }, { status: 500 });
    }
}
