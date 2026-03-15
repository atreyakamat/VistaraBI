import { NextResponse } from 'next/server';
import { validateStrategy } from '@/lib/module-8/strategy-validator';
import { ForecastRequest } from '@/lib/module-8/types';

export async function POST(request: Request) {
  try {
    const body: ForecastRequest = await request.json();
    
    // Basic validation
    if (!body.kpiHistory || !body.goalValue || !body.horizonDays) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const result = await validateStrategy(body);
    return NextResponse.json(result);
  } catch (error: any) {
    console.error("Forecast API Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}
