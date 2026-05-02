import { NextResponse } from 'next/server';
import { loadCSVFile } from '@/lib/demo/data-loaders';
import { processRetailData } from '@/lib/demo/retail-processor';
import path from 'path';

export async function GET() {
  try {
    const projectRoot = process.cwd();
    const retailPath = path.join(projectRoot, '..', 'dummy-data', 'retail_data.csv');

    const records = await loadCSVFile(retailPath);
    const kpis = await processRetailData(records);

    return NextResponse.json({
      success: true,
      records: records.slice(0, 100),
      recordCount: records.length,
      kpis,
      quality: {
        score: 98.5,
        completeness: '99.2%',
        accuracy: '98.5%',
        consistency: '98.8%',
        assessment: 'EXCELLENT'
      },
      timestamp: new Date().toISOString(),
      lineage: kpis.kpiLineage
    });
  } catch (error: any) {
    console.error('Retail data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Failed to process retail data',
        mode: 'demo'
      },
      { status: 500 }
    );
  }
}
