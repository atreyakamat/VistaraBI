import { spawn } from 'child_process';
import path from 'path';
import { ForecastRequest, ForecastPoint } from './types';

/**
 * A bridge to call the Python Prophet script.
 * If Python/Prophet is unavailable, it gracefully falls back to a linear projection.
 */
export async function generateBaselineForecast(req: ForecastRequest): Promise<ForecastPoint[]> {
  try {
    return await callPythonProphet(req);
  } catch (error) {
    console.warn("Prophet bridge failed, falling back to linear projection.", error);
    return generateFallbackLinearForecast(req);
  }
}

async function callPythonProphet(req: ForecastRequest): Promise<ForecastPoint[]> {
  return new Promise((resolve, reject) => {
    const scriptPath = path.join(process.cwd(), '..', 'scripts', 'forecast_bridge.py');
    const pythonProcess = spawn('python', [scriptPath]);
    
    let output = '';
    let errorOutput = '';

    pythonProcess.stdout.on('data', (data) => { output += data.toString(); });
    pythonProcess.stderr.on('data', (data) => { errorOutput += data.toString(); });

    pythonProcess.on('close', (code) => {
      if (code !== 0) {
        return reject(new Error(`Python process exited with code ${code}. Error: ${errorOutput}`));
      }
      try {
        const result = JSON.parse(output);
        resolve(result);
      } catch (e) {
        reject(new Error("Failed to parse Python Prophet output."));
      }
    });

    // Handle process spawn errors directly (e.g. python not found)
    pythonProcess.on('error', (err) => {
      reject(err);
    });

    pythonProcess.stdin.write(JSON.stringify(req));
    pythonProcess.stdin.end();
  });
}

/**
 * Fallback forecaster if Prophet is not installed.
 */
export function generateFallbackLinearForecast(req: ForecastRequest): ForecastPoint[] {
  const { kpiHistory, horizonDays } = req;
  const n = kpiHistory.length;
  if (n < 2) {
      // Default dummy forecast if totally empty
      return Array.from({length: horizonDays}).map((_, i) => ({
          date: new Date(Date.now() + i * 86400000).toISOString().split('T')[0],
          day: i + 1,
          yhat: req.goalValue / 2,
          yhatLower: req.goalValue / 3,
          yhatUpper: req.goalValue * 0.8
      }));
  }

  // Simple linear regression
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;
  kpiHistory.forEach((pt, i) => {
    sumX += i;
    sumY += pt.value;
    sumXY += i * pt.value;
    sumXX += i * i;
  });

  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;

  const lastDate = new Date(kpiHistory[n - 1].date);
  const forecast: ForecastPoint[] = [];

  for (let i = 1; i <= horizonDays; i++) {
    const futureDate = new Date(lastDate);
    futureDate.setDate(lastDate.getDate() + i);
    
    const x = n - 1 + i;
    const yhat = Math.max(0, intercept + slope * x); // prevent negative predictions
    
    // Naive confidence bounds expanding over time
    const uncertainty = yhat * 0.02 * i; // 2% per day of uncertainty growth
    
    forecast.push({
      date: futureDate.toISOString().split('T')[0],
      day: i,
      yhat,
      yhatLower: Math.max(0, yhat - uncertainty),
      yhatUpper: yhat + uncertainty
    });
  }

  return forecast;
}
