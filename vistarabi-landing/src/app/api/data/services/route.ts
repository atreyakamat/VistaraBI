import { NextResponse } from 'next/server';
import path from 'path';
import { loadCSVFile } from '@/lib/demo/data-loaders';
import { processServicesData } from '@/lib/demo/services-processor';
import type { ServicesRecord } from '@/lib/demo/services-processor';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'datasets', 'demo', 'services_demo.csv');
    const records = await loadCSVFile<ServicesRecord>(csvPath);
    const kpis = processServicesData(records);
    return NextResponse.json({ records, kpis, domain: 'Services', count: records.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Services data' },
      { status: 500 }
    );
  }
}
