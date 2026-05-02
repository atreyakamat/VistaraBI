/**
 * E-Commerce Data API Route
 */

import { loadEcommerceData } from '@/lib/demo/data-loaders';
import { processEcommerceData } from '@/lib/demo/ecommerce-processor';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { highQuality, orders, quality } = await loadEcommerceData();

    // Process the high-quality dataset to calculate KPIs
    const kpis = processEcommerceData(highQuality);

    return NextResponse.json(
      {
        success: true,
        records: highQuality,
        ordersData: orders,
        kpis,
        quality,
        recordCount: highQuality.length,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error loading E-Commerce data:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to load E-Commerce data',
      },
      { status: 500 }
    );
  }
}
