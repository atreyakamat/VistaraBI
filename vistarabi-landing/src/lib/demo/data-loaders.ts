/**
 * Real Data Loaders for E-Commerce and Finance Datasets
 * This module handles loading real CSV data into the demo system
 */

import fs from 'fs';
import path from 'path';
import Papa from 'papaparse';

// E-Commerce Data Types
export interface EcommerceRecord {
  date: string;
  order_id: string;
  customer_id: string;
  revenue: number;
  cogs: number;
  marketing_cost: number;
  sessions: number;
  cart_additions: number;
  category: string;
}

export interface EcommerceOrdersRecord {
  date: string;
  domain: string;
  metric: string;
  value: number;
  orders: number;
}

// Finance Data Types
export interface FinanceRecord {
  user_id: string;
  age: number;
  gender: string;
  education_level: string;
  employment_status: string;
  job_title: string;
  monthly_income_usd: number;
  monthly_expenses_usd: number;
  savings_usd: number;
  has_loan: string;
  loan_type: string;
  loan_amount_usd: number;
  loan_term_months: number;
  monthly_emi_usd: number;
  loan_interest_rate_pct: number;
  debt_to_income_ratio: number;
  credit_score: number;
  savings_to_income_ratio: number;
  region: string;
  record_date: string;
}

// Data Quality Report
export interface DataQualityReport {
  totalRows: number;
  validRows: number;
  nullValues: Record<string, number>;
  duplicates: number;
  outliers: Record<string, number>;
  missingColumns: string[];
  issues: string[];
}

/**
 * Load CSV file and parse it
 */
export async function loadCSVFile<T>(filePath: string): Promise<T[]> {
  return new Promise((resolve, reject) => {
    fs.readFile(filePath, 'utf8', (err, data) => {
      if (err) {
        reject(new Error(`Failed to read file ${filePath}: ${err.message}`));
        return;
      }

      Papa.parse(data, {
        complete: (results) => {
          const filteredData = (results.data as unknown[])
            .filter((row) => {
              if (typeof row === 'object' && row !== null) {
                return Object.keys(row as Record<string, unknown>).some((key) => (row as Record<string, unknown>)[key]);
              }
              return false;
            }) as T[];
          resolve(filteredData);
        },
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        error: (error: Error) => {
          reject(new Error(`Failed to parse CSV: ${error.message}`));
        },
      });
    });
  });
}

/**
 * Load E-Commerce data from CSV
 */
export async function loadEcommerceData(): Promise<{
  highQuality: EcommerceRecord[];
  orders: EcommerceOrdersRecord[];
  quality: DataQualityReport;
}> {
  // The data files are in the parent directory of vistarabi-landing
  const projectRoot = process.cwd();
  const highQualityPath = path.join(
    projectRoot,
    '..',
    'dummy-data',
    'ecommerce_high_quality.csv'
  );
  const ordersPath = path.join(
    projectRoot,
    '..',
    'dummy-data',
    'module-8',
    'ecommerce_orders.csv'
  );

  try {
    const rawHighQuality = await loadCSVFile<Record<string, any>>(highQualityPath);
    const orders = await loadCSVFile<EcommerceOrdersRecord>(ordersPath);

    // Normalize columns to expected EcommerceRecord shape
    const highQuality: EcommerceRecord[] = rawHighQuality.map((r: Record<string, any>) => ({
      date: (r.date || r.order_date || r.orderDate || '').toString(),
      order_id: (r.order_id || r.orderId || r.order_id)?.toString() || '',
      customer_id: (r.customer_id || r.customerId || r.customer_id)?.toString() || '',
      revenue: Number(r.revenue ?? r.total_spend ?? r.total_spend_usd ?? 0) || 0,
      cogs: Number(r.cogs ?? r.cost_of_goods_sold ?? 0) || 0,
      marketing_cost: Number(r.marketing_cost ?? r.marketing_spend ?? 0) || 0,
      sessions: Number(r.sessions ?? 0) || 0,
      cart_additions: Number(r.cart_additions ?? r.cart_size ?? 0) || 0,
      category: (r.category || r.drink_category || r.category || r.product_category || '').toString() || 'Unknown',
    }));

    const quality = assessDataQuality(
      highQuality,
      ['date', 'order_id', 'customer_id', 'revenue', 'cogs', 'marketing_cost', 'sessions', 'cart_additions', 'category']
    );

    return { highQuality, orders, quality };
  } catch (error) {
    throw new Error(`Failed to load E-Commerce data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Load Finance data from CSV
 */
export async function loadFinanceData(): Promise<{
  records: FinanceRecord[];
  quality: DataQualityReport;
}> {
  const projectRoot = process.cwd();
  const financePath = path.join(
    projectRoot,
    'datasets',
    'finance',
    'archive (52)',
    'synthetic_personal_finance_dataset.csv'
  );

  // Try alternative path if current doesn't exist
  let actualPath = financePath;
  if (!fs.existsSync(financePath)) {
    // Search for any synthetic finance CSV in datasets/finance recursively
    const financeDir = path.join(projectRoot, 'datasets', 'finance');
    if (fs.existsSync(financeDir)) {
      const entries = fs.readdirSync(financeDir, { withFileTypes: true });
      let found: string | null = null;

      function searchDir(dir: string) {
        const items = fs.readdirSync(dir, { withFileTypes: true });
        for (const it of items) {
          const p = path.join(dir, it.name);
          if (it.isDirectory()) {
            // Recurse one level deep
            try { searchDir(p); } catch { /* ignore */ }
          } else if (it.isFile()) {
            if (/synthetic.*finance.*\.csv$/i.test(it.name) || /synthetic_personal_finance_dataset.*\.csv$/i.test(it.name)) {
              found = p;
              return;
            }
          }
        }
      }

      try {
        searchDir(financeDir);
      } catch {}

      if (found) actualPath = found;
    }

    // last resort: look in repo root dummy-data
    const altRoot = path.join(projectRoot, '..', 'dummy-data', 'synthetic_personal_finance_dataset.csv');
    if (!fs.existsSync(actualPath) && fs.existsSync(altRoot)) actualPath = altRoot;
  }

  try {
    if (!fs.existsSync(actualPath)) {
      throw new Error(`Finance CSV not found at expected locations (tried: ${financePath}, ${actualPath})`);
    }

    const records = await loadCSVFile<FinanceRecord>(actualPath);

    const quality = assessDataQuality(
      records,
      [
        'user_id', 'age', 'gender', 'education_level', 'employment_status',
        'monthly_income_usd', 'monthly_expenses_usd', 'credit_score'
      ]
    );

    return { records, quality };
  } catch (error) {
    throw new Error(`Failed to load Finance data: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Assess data quality
 */
function assessDataQuality<T extends Record<string, any>>(
  data: T[],
  expectedColumns: string[]
): DataQualityReport {
  const report: DataQualityReport = {
    totalRows: data.length,
    validRows: 0,
    nullValues: {},
    duplicates: 0,
    outliers: {},
    missingColumns: [],
    issues: [],
  };

  if (data.length === 0) {
    report.issues.push('Dataset is empty');
    return report;
  }

  // Check for missing columns
  const actualColumns = Object.keys(data[0]);
  report.missingColumns = expectedColumns.filter((col) => !actualColumns.includes(col));

  // Check for null values and outliers
  const nullCounts: Record<string, number> = {};
  const rowValidities: boolean[] = [];

  expectedColumns.forEach((col) => {
    nullCounts[col] = 0;
  });

  data.forEach((row) => {
    let isValid = true;

    expectedColumns.forEach((col) => {
      if (row[col] === null || row[col] === undefined || row[col] === '') {
        nullCounts[col]++;
        isValid = false;
      }
    });

    rowValidities.push(isValid);
  });

  report.nullValues = nullCounts;
  report.validRows = rowValidities.filter((v) => v).length;

  // Check for duplicates (based on first meaningful column)
  const firstCol = expectedColumns[0];
  const seen = new Set<any>();
  data.forEach((row) => {
    if (seen.has(row[firstCol])) {
      report.duplicates++;
    } else {
      seen.add(row[firstCol]);
    }
  });

  // Check for potential outliers (numeric columns)
  expectedColumns.forEach((col) => {
    const numericValues = data
      .map((row) => row[col])
      .filter((v) => typeof v === 'number' && v !== null && v !== undefined);

    if (numericValues.length > 0) {
      const mean = numericValues.reduce((a, b) => a + b, 0) / numericValues.length;
      const stdDev = Math.sqrt(
        numericValues.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / numericValues.length
      );

      const outlierThreshold = 3; // Standard deviation multiplier
      const outlierCount = numericValues.filter(
        (v) => Math.abs(v - mean) > outlierThreshold * stdDev
      ).length;

      if (outlierCount > 0) {
        report.outliers[col] = outlierCount;
      }
    }
  });

  // Generate issue summary
  if (report.missingColumns.length > 0) {
    report.issues.push(`Missing columns: ${report.missingColumns.join(', ')}`);
  }

  const totalNulls = Object.values(report.nullValues).reduce((a, b) => a + b, 0);
  if (totalNulls > 0) {
    report.issues.push(`Found ${totalNulls} null/empty values across dataset`);
  }

  if (report.duplicates > 0) {
    report.issues.push(`Found ${report.duplicates} duplicate records`);
  }

  return report;
}

/**
 * Get data source info
 */
export function getDataSourceInfo(): {
  ecommerce: { path: string; description: string };
  finance: { path: string; description: string };
} {
  return {
    ecommerce: {
      path: '../dummy-data/ecommerce_high_quality.csv',
      description: 'Real e-commerce transaction data with order details, customer info, and sales metrics',
    },
    finance: {
      path: 'datasets/finance/archive (52)/synthetic_personal_finance_dataset.csv',
      description: 'Synthetic personal finance data with income, expenses, debt, and credit metrics',
    },
  };
}
