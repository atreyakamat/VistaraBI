import { NextResponse } from 'next/server';
import path from 'path';
import { loadCSVFile } from '@/lib/demo/data-loaders';
import { processHealthcareData } from '@/lib/demo/healthcare-processor';
import type { HealthcareRecord } from '@/lib/demo/healthcare-processor';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'datasets', 'demo', 'healthcare_demo.csv');
    const records = await loadCSVFile<HealthcareRecord>(csvPath);
    const kpis = processHealthcareData(records);
    return NextResponse.json({ records, kpis, domain: 'Healthcare', count: records.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load Healthcare data' },
      { status: 500 }
    );
  }
}
