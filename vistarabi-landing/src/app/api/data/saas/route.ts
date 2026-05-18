import { NextResponse } from 'next/server';
import path from 'path';
import { loadCSVFile } from '@/lib/demo/data-loaders';
import { processSaaSData } from '@/lib/demo/saas-processor';
import type { SaaSRecord } from '@/lib/demo/saas-processor';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'datasets', 'demo', 'saas_demo.csv');
    const records = await loadCSVFile<SaaSRecord>(csvPath);
    const kpis = processSaaSData(records);
    return NextResponse.json({ records, kpis, domain: 'SaaS', count: records.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load SaaS data' },
      { status: 500 }
    );
  }
}
