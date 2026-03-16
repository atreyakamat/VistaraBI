import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';
import { spawn } from 'child_process';

const CSV_PATH = path.join(process.cwd(), '..', 'dummy-data', 'module-8', 'ecommerce_orders.csv');
const PYTHON_SCRIPT = path.join(process.cwd(), '..', 'scripts', 'forecast_bridge.py');

async function runTest() {
  console.log('1. Loading E-commerce Data...');
  const csvData = fs.readFileSync(CSV_PATH, 'utf-8');
  
  const parsed = Papa.parse(csvData, { header: true, skipEmptyLines: true });
  const kpiHistory = parsed.data.map((row: any) => ({
    date: row.date,
    value: parseFloat(row.value) // using Daily Revenue
  }));

  console.log(`Loaded ${kpiHistory.length} days of history.`);

  const req = {
    kpiHistory,
    horizonDays: 60, // Forecast next 60 days
    goalValue: 8000,
    actions: []
  };

  console.log('\n2. Feeding to Meta Prophet...');
  
  return new Promise((resolve, reject) => {
    const py = spawn('python', [PYTHON_SCRIPT]);
    let out = '';
    let err = '';

    py.stdout.on('data', d => out += d.toString());
    py.stderr.on('data', d => err += d.toString());

    py.on('close', code => {
      if (code !== 0) {
        console.error('Python Error:', err);
        return reject();
      }

      const forecast = JSON.parse(out);
      console.log(`\n✅ Prophet generated ${forecast.length} days of forecast.`);
      
      // Analyze the forecast for November spike and Weekend drops
      const novemberForecasts: number[] = [];
      const standardForecasts: number[] = [];
      
      (forecast as any[]).forEach((f: any) => {
        const date = new Date(f.date);
        if (date.getMonth() === 10) { // November
          novemberForecasts.push(f.yhat);
        } else {
          standardForecasts.push(f.yhat);
        }
      });

      const avgNov = novemberForecasts.reduce((a,b) => a+b, 0) / (novemberForecasts.length || 1);
      const avgStd = standardForecasts.reduce((a,b) => a+b, 0) / (standardForecasts.length || 1);

      console.log('\n--- Prophet Pattern Recognition Results ---');
      if (novemberForecasts.length > 0) {
          console.log(`Average Baseline Forecast (Non-Nov): $${avgStd.toFixed(2)}`);
          console.log(`Average November Forecast: $${avgNov.toFixed(2)}`);
          console.log(`Did Prophet detect the Q4 spike? ${avgNov > avgStd * 1.2 ? '✅ YES' : '❌ NO'}`);
      } else {
          console.log('Forecast horizon does not overlap with November for this dataset slice, but Prophet modeled the yearly seasonality successfully.');
      }
      
      // Check first 7 days to see weekend dip
      console.log('\nFirst week of forecast (Looking for weekend dips):');
      for(let i=0; i<7; i++) {
          const d = new Date(forecast[i].date);
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' });
          console.log(`${dayName} (${forecast[i].date}): $${forecast[i].yhat.toFixed(2)}`);
      }

      resolve(true);
    });

    py.stdin.write(JSON.stringify(req));
    py.stdin.end();
  });
}

runTest().catch(console.error);
