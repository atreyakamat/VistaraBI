// GET /api/templates/[domain] — download a domain-specific CSV template
// Returns a pre-formatted CSV file with realistic sample headers for the requested domain.

import { NextRequest, NextResponse } from 'next/server';

const HEADERS = [
    'timestamp', 'record_id', 'entity_id', 'entity_segment', 'entity_region', 
    'target_id', 'target_category', 'target_subcategory', 'event_style', 'event_channel', 
    'status', 'metric_1_value', 'metric_2_time_ms', 'metric_3_rate', 'metric_4_physical', 
    'metric_5_financial', 'flag_1_active', 'flag_2_priority', 'context_1', 'context_2', 
    'tag_1', 'tag_2', 'version_code', 'coord_x', 'coord_y'
];

const TEMPLATES: Record<string, { headers: string[]; sample: string[][] }> = {
    ecommerce: {
        headers: HEADERS,
        sample: [
            ['2026-07-01T12:00:00.000Z', 'REC_1001', 'ENT_001', 'Premium', 'North', 'TGT_882', 'Category_A', 'Sub_1', 'purchase', 'Web', 'Success', '150.50', '1250', '0.85', '22.5', '120.00', 'true', 'true', 'CTX_1', 'CTX_A', 'TagA', 'Group1', 'v1.0', '40.7128', '-74.0060'],
            ['2026-07-01T12:05:00.000Z', 'REC_1002', 'ENT_002', 'Basic', 'South', 'TGT_332', 'Category_B', 'Sub_2', 'add_to_cart', 'Mobile_App', 'Pending', '0', '450', '0.00', '21.0', '0.00', 'true', 'false', 'CTX_2', 'CTX_B', 'TagB', 'Group2', 'v1.1', '34.0522', '-118.2437'],
        ],
    },
    edtech: {
        headers: HEADERS,
        sample: [
            ['2026-07-01T09:00:00.000Z', 'REC_2001', 'ENT_901', 'Student', 'East', 'TGT_112', 'Tech', 'Programming', 'video_play', 'Web', 'Success', '100', '360000', '0.99', '25.0', '0.00', 'true', 'false', 'CTX_3', 'CTX_C', 'TagC', 'Group1', 'v2.0', '51.5074', '-0.1278'],
            ['2026-07-01T10:15:00.000Z', 'REC_2002', 'ENT_902', 'Professional', 'West', 'TGT_222', 'Business', 'Finance', 'quiz_submit', 'Mobile_App', 'Success', '85.5', '1200000', '1.00', '26.0', '0.00', 'true', 'true', 'CTX_4', 'CTX_D', 'TagA', 'Group3', 'v2.1', '48.8566', '2.3522'],
        ],
    },
    retail: { headers: HEADERS, sample: [] },
    saas: { headers: HEADERS, sample: [] },
    healthcare: { headers: HEADERS, sample: [] },
    finance: { headers: HEADERS, sample: [] },
    manufacturing: { headers: HEADERS, sample: [] },
    services: { headers: HEADERS, sample: [] }
};

// Auto-fill empty samples with generic data for robustness
Object.keys(TEMPLATES).forEach(key => {
    if (TEMPLATES[key].sample.length === 0) {
        TEMPLATES[key].sample = [
            ['2026-07-01T12:00:00.000Z', 'REC_0001', 'ENT_001', 'Standard', 'Central', 'TGT_001', 'Category_A', 'Sub_1', 'view', 'Web', 'Success', '50.00', '2000', '0.50', '20.0', '50.00', 'true', 'false', 'CTX_1', 'CTX_2', 'Tag1', 'Group1', 'v1.0', '0', '0']
        ];
    }
});

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ domain: string }> }
) {
    const { domain } = await params;
    const template = TEMPLATES[domain.toLowerCase()];

    if (!template) {
        return NextResponse.json(
            { error: `No template for domain: ${domain}. Available: ${Object.keys(TEMPLATES).join(', ')}` },
            { status: 404 }
        );
    }

    const lines = [
        template.headers.join(','),
        ...template.sample.map(row => row.join(',')),
    ];
    const csv = lines.join('\n');

    return new NextResponse(csv, {
        status: 200,
        headers: {
            'Content-Type': 'text/csv; charset=utf-8',
            'Content-Disposition': `attachment; filename="vistarabi-${domain}-template.csv"`,
            'Cache-Control': 'public, max-age=86400',
        },
    });
}
