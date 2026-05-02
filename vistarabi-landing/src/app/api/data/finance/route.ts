/**
 * Finance Data API Route
 */

import { loadFinanceData } from '@/lib/demo/data-loaders';
import { processFinanceData } from '@/lib/demo/finance-processor';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { records, quality } = await loadFinanceData();

    // Process the finance dataset to calculate KPIs
    const kpis = processFinanceData(records);

    return NextResponse.json(
      {
        success: true,
        records,
        kpis,
        quality,
        recordCount: records.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading Finance data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load Finance data',
      },
      { status: 500 }
    );
  }
}
