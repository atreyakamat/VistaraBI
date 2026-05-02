/**
 * Finance Data Processor
 * Calculates KPIs from real personal finance dataset
 */

import { FinanceRecord } from './data-loaders';

export interface FinanceKPIs {
  averageIncome: number;
  averageExpenses: number;
  averageSavings: number;
  savingsRate: number;
  debtToIncomeRatio: number;
  averageCreditScore: number;
  averageAgeOfAccounts: number;
  employmentDistribution: Record<string, number>;
  incomeDistributionByRegion: Record<string, number>;
  debtAnalysis: {
    totalWithLoans: number;
    averageLoanAmount: number;
    commonLoanTypes: Record<string, number>;
  };
  educationImpactOnIncome: Record<string, number>;
  ageIncomeCorrelation: number;
  riskProfile: string;
  kpiLineage: Record<string, FinanceKPILineage>;
}

export interface FinanceKPILineage {
  kpiName: string;
  formula: string;
  sourceRows: string[]; // user_ids
  value: number;
  contributes: Record<string, number>;
}

/**
 * Process finance data and calculate KPIs
 */
export function processFinanceData(records: FinanceRecord[]): FinanceKPIs {
  if (records.length === 0) {
    return getEmptyFinanceKPIs();
  }

  const lineage: Record<string, FinanceKPILineage> = {};

  // Basic aggregations
  const totalIncome = records.reduce((sum, r) => sum + (r.monthly_income_usd || 0), 0);
  const totalExpenses = records.reduce((sum, r) => sum + (r.monthly_expenses_usd || 0), 0);
  const totalSavings = records.reduce((sum, r) => sum + (r.savings_usd || 0), 0);
  const totalDebtToIncomeRatio = records.reduce((sum, r) => sum + (r.debt_to_income_ratio || 0), 0);
  const totalCreditScore = records.reduce((sum, r) => sum + (r.credit_score || 0), 0);
  const totalAge = records.reduce((sum, r) => sum + (r.age || 0), 0);

  const recordCount = records.length;

  // Average metrics
  const averageIncome = totalIncome / recordCount;
  const averageExpenses = totalExpenses / recordCount;
  const averageSavings = totalSavings / recordCount;
  const savingsRate = averageIncome > 0 ? (averageSavings / averageIncome) * 100 : 0;
  const debtToIncomeRatio = totalDebtToIncomeRatio / recordCount;
  const averageCreditScore = Math.round(totalCreditScore / recordCount);
  const averageAge = Math.round(totalAge / recordCount);

  // Lineage tracking
  lineage['averageIncome'] = {
    kpiName: 'Average Monthly Income',
    formula: 'AVG(monthly_income_usd)',
    sourceRows: records.map((r) => r.user_id),
    value: averageIncome,
    contributes: { income: averageIncome, count: recordCount },
  };

  lineage['averageExpenses'] = {
    kpiName: 'Average Monthly Expenses',
    formula: 'AVG(monthly_expenses_usd)',
    sourceRows: records.map((r) => r.user_id),
    value: averageExpenses,
    contributes: { expenses: averageExpenses, count: recordCount },
  };

  lineage['savingsRate'] = {
    kpiName: 'Savings Rate',
    formula: '(AVG(savings_usd) / AVG(monthly_income_usd)) * 100',
    sourceRows: records.map((r) => r.user_id),
    value: savingsRate,
    contributes: { savingsRate, avgSavings: averageSavings, avgIncome: averageIncome },
  };

  lineage['debtToIncome'] = {
    kpiName: 'Debt to Income Ratio',
    formula: 'AVG(debt_to_income_ratio)',
    sourceRows: records.map((r) => r.user_id),
    value: debtToIncomeRatio,
    contributes: { ratio: debtToIncomeRatio },
  };

  lineage['creditScore'] = {
    kpiName: 'Average Credit Score',
    formula: 'AVG(credit_score)',
    sourceRows: records.map((r) => r.user_id),
    value: averageCreditScore,
    contributes: { score: averageCreditScore },
  };

  // Employment distribution
  const employmentMap: Record<string, number> = {};
  records.forEach((r) => {
    const status = r.employment_status || 'Unknown';
    employmentMap[status] = (employmentMap[status] || 0) + 1;
  });

  const employmentDistribution = Object.fromEntries(
    Object.entries(employmentMap).map(([status, count]) => [
      status,
      Math.round((count / recordCount) * 100),
    ])
  );

  // Regional income distribution
  const regionIncomeMap: Record<string, { total: number; count: number }> = {};
  records.forEach((r) => {
    const region = r.region || 'Unknown';
    if (!regionIncomeMap[region]) {
      regionIncomeMap[region] = { total: 0, count: 0 };
    }
    regionIncomeMap[region].total += r.monthly_income_usd || 0;
    regionIncomeMap[region].count += 1;
  });

  const incomeDistributionByRegion = Object.fromEntries(
    Object.entries(regionIncomeMap).map(([region, data]) => [
      region,
      Math.round(data.total / data.count),
    ])
  );

  // Debt analysis
  const recordsWithLoans = records.filter((r) => r.has_loan === 'Yes' || r.has_loan === 'yes');
  const totalLoanAmount = recordsWithLoans.reduce((sum, r) => sum + (r.loan_amount_usd || 0), 0);
  const averageLoanAmount = recordsWithLoans.length > 0 ? totalLoanAmount / recordsWithLoans.length : 0;

  const loanTypeMap: Record<string, number> = {};
  recordsWithLoans.forEach((r) => {
    const loanType = r.loan_type || 'Other';
    loanTypeMap[loanType] = (loanTypeMap[loanType] || 0) + 1;
  });

  const debtAnalysis = {
    totalWithLoans: recordsWithLoans.length,
    averageLoanAmount,
    commonLoanTypes: loanTypeMap,
  };

  // Education impact on income
  const educationIncomeMap: Record<string, { total: number; count: number }> = {};
  records.forEach((r) => {
    const education = r.education_level || 'Unknown';
    if (!educationIncomeMap[education]) {
      educationIncomeMap[education] = { total: 0, count: 0 };
    }
    educationIncomeMap[education].total += r.monthly_income_usd || 0;
    educationIncomeMap[education].count += 1;
  });

  const educationImpactOnIncome = Object.fromEntries(
    Object.entries(educationIncomeMap).map(([education, data]) => [
      education,
      Math.round(data.total / data.count),
    ])
  );

  // Age-Income correlation (simplified Pearson)
  const ageIncomePairs = records.map((r) => ({ age: r.age || 0, income: r.monthly_income_usd || 0 }));
  const ageIncomeCorrelation = calculatePearsonCorrelation(
    ageIncomePairs.map((p) => p.age),
    ageIncomePairs.map((p) => p.income)
  );

  // Risk profile classification
  const avgDTI = debtToIncomeRatio;
  const avgCredit = averageCreditScore;
  let riskProfile = 'Moderate';

  if (avgCredit >= 750 && avgDTI < 0.36) {
    riskProfile = 'Low Risk';
  } else if (avgCredit >= 700 && avgDTI < 0.43) {
    riskProfile = 'Low-Moderate Risk';
  } else if (avgCredit < 600 || avgDTI > 0.5) {
    riskProfile = 'High Risk';
  }

  return {
    averageIncome,
    averageExpenses,
    averageSavings,
    savingsRate,
    debtToIncomeRatio,
    averageCreditScore,
    averageAgeOfAccounts: averageAge,
    employmentDistribution,
    incomeDistributionByRegion,
    debtAnalysis,
    educationImpactOnIncome,
    ageIncomeCorrelation,
    riskProfile,
    kpiLineage: lineage,
  };
}

/**
 * Calculate Pearson correlation coefficient
 */
function calculatePearsonCorrelation(x: number[], y: number[]): number {
  if (x.length !== y.length || x.length === 0) return 0;

  const n = x.length;
  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.reduce((sum, xi, i) => sum + xi * y[i], 0);
  const sumX2 = x.reduce((sum, xi) => sum + xi * xi, 0);
  const sumY2 = y.reduce((sum, yi) => sum + yi * yi, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  return denominator === 0 ? 0 : numerator / denominator;
}

/**
 * Get empty KPIs structure
 */
function getEmptyFinanceKPIs(): FinanceKPIs {
  return {
    averageIncome: 0,
    averageExpenses: 0,
    averageSavings: 0,
    savingsRate: 0,
    debtToIncomeRatio: 0,
    averageCreditScore: 0,
    averageAgeOfAccounts: 0,
    employmentDistribution: {},
    incomeDistributionByRegion: {},
    debtAnalysis: {
      totalWithLoans: 0,
      averageLoanAmount: 0,
      commonLoanTypes: {},
    },
    educationImpactOnIncome: {},
    ageIncomeCorrelation: 0,
    riskProfile: 'Unknown',
    kpiLineage: {},
  };
}

/**
 * Get KPI details with source data
 */
export function getFinanceKPIWithSource(
  kpiName: string,
  records: FinanceRecord[],
  kpis: FinanceKPIs
): {
  kpi: string;
  value: number;
  description: string;
  sourceData: FinanceRecord[];
  lineage: FinanceKPILineage | null;
} {
  const lineage = kpis.kpiLineage[kpiName] || null;
  const sourceUserIds = lineage?.sourceRows || [];
  const sourceData = records.filter((r) => sourceUserIds.includes(r.user_id));

  return {
    kpi: kpiName,
    value: kpis[kpiName as keyof FinanceKPIs] as number,
    description: lineage?.kpiName || kpiName,
    sourceData,
    lineage,
  };
}
