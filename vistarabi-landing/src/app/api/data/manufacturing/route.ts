import { NextResponse } from 'next/server';
import { loadCSVFile } from '@/lib/demo/data-loaders';
import { processManufacturingData } from '@/lib/demo/manufacturing-processor';
import path from 'path';

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const retailPath = path.join(projectRoot, '..', 'dummy-data', 'retail_data.csv');

    // Use retail data as basis for manufacturing metrics
    const records = await loadCSVFile(retailPath);
    const kpis = await processManufacturingData(records);

    return NextResponse.json({
      success: true,
      records: records.slice(0, 100),
      recordCount: records.length,
      kpis,
      quality: {
        score: 95.8,
        completeness: '98.5%',
        accuracy: '95.8%',
        consistency: '96.2%',
        assessment: 'EXCELLENT'
      },
      timestamp: new Date().toISOString(),
      lineage: kpis.kpiLineage
    });
  } catch (error: any) {
    console.error('Manufacturing data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process manufacturing data',
        mode: 'demo'
      },
      { status: 500 }
    );
  }
}
