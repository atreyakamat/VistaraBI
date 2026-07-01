import { validateStrategy } from './src/lib/module-8/strategy-validator';
import type { ForecastRequest } from './src/lib/module-8/types';
import * as fs from 'fs';
import * as path from 'path';

// Helper function to parse CSV data
function parseCSVData(csvData: string): { date: string; value: number }[] {
  const lines = csvData.trim().split('\n');
  const headers = lines[0].split(',');
  const dateIndex = headers.indexOf('order_date');
  const totalIndex = headers.indexOf('order_total');
  
  const result: { date: string; value: number }[] = [];
  
  for (let i = 1; i < lines.length && i < 31; i++) { // Limit to 30 days for testing
    const columns = lines[i].split(',');
    if (columns.length > Math.max(dateIndex, totalIndex)) {
      const dateStr = columns[dateIndex].split(' ')[0]; // Extract just the date part
      const totalValue = parseFloat(columns[totalIndex]);
      if (!isNaN(totalValue)) {
        result.push({ date: dateStr, value: totalValue });
      }
    }
  }
  
  // Aggregate by date (sum of order totals per day)
  const dailyTotals: Record<string, number> = {};
  for (const item of result) {
    if (!dailyTotals[item.date]) {
      dailyTotals[item.date] = 0;
    }
    dailyTotals[item.date] += item.value;
  }
  
  // Convert back to array and sort by date
  return Object.keys(dailyTotals)
    .map(date => ({ date, value: dailyTotals[date] }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

async function testForecast() {
  // Read the blinkit_orders.csv file
  const filePath = path.join(__dirname, 'datasets', 'retail', 'blinkit_orders.csv');
  const csvData = fs.readFileSync(filePath, 'utf8');
  
  // Parse and aggregate the data
  const kpiHistory = parseCSVData(csvData);
  
  if (kpiHistory.length === 0) {
    console.error("No valid data found in CSV file");
    return;
  }
  
  // Calculate the average daily order value for setting a realistic goal
  const totalSum = kpiHistory.reduce((sum, item) => sum + item.value, 0);
  const avgDailyValue = totalSum / kpiHistory.length;
  const goalValue = avgDailyValue * 1.15; // Aim for 15% increase
  
  const req: ForecastRequest = {
    kpiHistory: kpiHistory,
    goalValue: goalValue,
    horizonDays: 30,
    actions: [
      { 
        id: '1', 
        name: 'Marketing Campaign', 
        expectedUplift: 0.15, 
        rampDays: 7, 
        startDayOffset: 2 
      }
    ],
    confidenceLevel: 0.8,
    domain: 'RETAIL'
  };

  try {
    console.log(`Testing with ${kpiHistory.length} days of historical data`);
    console.log(`Average daily value: ${avgDailyValue.toFixed(2)}`);
    console.log(`Goal value: ${goalValue.toFixed(2)}`);
    
    const result = await validateStrategy(req);
    console.log("Strategy validation successful!");
    console.log("Probability of Success:", (result.probabilityOfSuccess * 100).toFixed(2) + "%");
    console.log("Reliability Score:", result.reliabilityScore.toFixed(2));
    console.log("Baseline Forecast Length:", result.scenarios.baseline.length);
    
    // Show some forecast values
    console.log("\nSample forecast values:");
    console.log("Day 1:", result.scenarios.baseline[0].yhat.toFixed(2));
    console.log("Day 15:", result.scenarios.baseline[14].yhat.toFixed(2));
    console.log("Day 30:", result.scenarios.baseline[29].yhat.toFixed(2));
  } catch (error) {
    console.error("Strategy validation failed:", error);
  }
}

testForecast();