import fs from 'fs';
import path from 'path';
import { faker } from '@faker-js/faker';

// Configuration
const DAYS_TO_GENERATE = 365;
const START_DATE = new Date();
START_DATE.setDate(START_DATE.getDate() - DAYS_TO_GENERATE);

const OUTPUT_DIR = path.join(process.cwd(), '..', 'dummy-data', 'module-8');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// ─── 1. E-COMMERCE GENERATOR (With Black Friday Spike) ──────────────────────
function generateEcommerceData() {
  const data = [];
  let baseSales = 5000;

  for (let i = 0; i < DAYS_TO_GENERATE; i++) {
    const currentDate = new Date(START_DATE.getTime() + i * 86400000);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    const dayOfWeek = currentDate.getDay(); // 0 is Sunday, 6 is Saturday
    const month = currentDate.getMonth();   // 0 is Jan, 10 is Nov

    // Hidden Truth 1: Weekend Dip (15% drop on Sat/Sun)
    let dailySales = baseSales + faker.number.int({ min: -500, max: 500 });
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      dailySales *= 0.85; 
    }

    // Hidden Truth 2: Q4 Black Friday Spike (November +40%)
    if (month === 10) { // November
      dailySales *= 1.40;
    }

    // Add some random noise
    dailySales *= (1 + (Math.random() - 0.5) * 0.05);

    data.push({
      date: dateStr,
      domain: 'E-commerce',
      metric: 'Daily Revenue',
      value: Math.round(dailySales),
      orders: Math.round(dailySales / faker.number.int({ min: 50, max: 100 })) // AOV $50-$100
    });
  }

  return data;
}

// ─── 2. SAAS GENERATOR (With Churn Event) ──────────────────────────────────
function generateSaaSData() {
  const data = [];
  let mrr = 100000;

  for (let i = 0; i < DAYS_TO_GENERATE; i++) {
    const currentDate = new Date(START_DATE.getTime() + i * 86400000);
    const dateStr = currentDate.toISOString().split('T')[0];
    
    // Steady growth
    mrr += faker.number.int({ min: 100, max: 300 });

    // Hidden Truth 3: End of Month Upgrade Spike
    const isEndOfMonth = currentDate.getDate() >= 28;
    if (isEndOfMonth) {
      mrr += faker.number.int({ min: 500, max: 1500 }); // Sales team closing deals
    }

    // Hidden Truth 4: Massive Churn Event on Day 200
    if (i === 200) {
      mrr *= 0.90; // Lost 10% of MRR instantly (e.g., major enterprise client left)
    }

    data.push({
      date: dateStr,
      domain: 'SaaS',
      metric: 'MRR',
      value: Math.round(mrr),
      active_customers: Math.round(mrr / 200) // Assuming $200 ARPU
    });
  }

  return data;
}

// ─── 3. HEALTHCARE GENERATOR (With Flu Season) ─────────────────────────────
function generateHealthcareData() {
  const data = [];
  let baseBedOccupancy = 300; // Hospital with ~400 beds

  for (let i = 0; i < DAYS_TO_GENERATE; i++) {
    const currentDate = new Date(START_DATE.getTime() + i * 86400000);
    const dateStr = currentDate.toISOString().split('T')[0];
    const month = currentDate.getMonth();

    let dailyOccupancy = baseBedOccupancy + faker.number.int({ min: -20, max: 20 });

    // Hidden Truth 5: Winter Flu Variant (Dec, Jan, Feb = +25% capacity load)
    if (month === 11 || month === 0 || month === 1) {
      dailyOccupancy *= 1.25;
    }

    // Ensure we don't exceed an arbitrary max hospital capacity of 500
    dailyOccupancy = Math.min(500, dailyOccupancy);

    data.push({
      date: dateStr,
      domain: 'Healthcare',
      metric: 'Bed Occupancy',
      value: Math.round(dailyOccupancy),
      avg_wait_time_mins: Math.round((dailyOccupancy / 500) * 120 + faker.number.int({ min: -10, max: 10 })) // Wait times correlate to occupancy
    });
  }

  return data;
}

// ─── CSV EXPORTER ──────────────────────────────────────────────────────────
function toCSV(data: any[]) {
  if (data.length === 0) return '';
  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(','));
  return [headers, ...rows].join('\n');
}

// ─── RUN ───────────────────────────────────────────────────────────────────
console.log('Generating E-commerce data...');
fs.writeFileSync(path.join(OUTPUT_DIR, 'ecommerce_orders.csv'), toCSV(generateEcommerceData()));

console.log('Generating SaaS data...');
fs.writeFileSync(path.join(OUTPUT_DIR, 'saas_mrr.csv'), toCSV(generateSaaSData()));

console.log('Generating Healthcare data...');
fs.writeFileSync(path.join(OUTPUT_DIR, 'healthcare_capacity.csv'), toCSV(generateHealthcareData()));

console.log(`\n✅ Successfully generated 3 domain datasets in: ${OUTPUT_DIR}`);
