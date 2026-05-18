import { NextResponse } from 'next/server';
import path from 'path';
import { loadCSVFile } from '@/lib/demo/data-loaders';
import { processEdTechData } from '@/lib/demo/edtech-processor';
import type { EdTechRecord } from '@/lib/demo/edtech-processor';

export async function GET() {
  try {
    const csvPath = path.join(process.cwd(), 'datasets', 'demo', 'edtech_demo.csv');
    const records = await loadCSVFile<EdTechRecord>(csvPath);
    const kpis = processEdTechData(records);
    return NextResponse.json({ records, kpis, domain: 'EdTech', count: records.length });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load EdTech data' },
      { status: 500 }
    );
  }
}
