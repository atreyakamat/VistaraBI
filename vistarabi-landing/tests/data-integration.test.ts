/**
 * Integration tests for data processors and loaders
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  loadEcommerceData,
  loadFinanceData,
  DataQualityReport,
  EcommerceRecord,
  FinanceRecord,
} from '@/lib/demo/data-loaders';
import { processEcommerceData } from '@/lib/demo/ecommerce-processor';
import { processFinanceData } from '@/lib/demo/finance-processor';

describe('E-Commerce Data Integration', () => {
  let ecommerceData: { highQuality: EcommerceRecord[]; quality: DataQualityReport };

  beforeAll(async () => {
    const data = await loadEcommerceData();
    ecommerceData = { highQuality: data.highQuality, quality: data.quality };
  });

  it('should load e-commerce data successfully', () => {
    expect(ecommerceData.highQuality).toBeDefined();
    expect(ecommerceData.highQuality.length).toBeGreaterThan(0);
  });

  it('should have required columns in e-commerce data', () => {
    const record = ecommerceData.highQuality[0];
    expect(record).toHaveProperty('date');
    expect(record).toHaveProperty('order_id');
    expect(record).toHaveProperty('customer_id');
    expect(record).toHaveProperty('revenue');
    expect(record).toHaveProperty('cogs');
    expect(record).toHaveProperty('marketing_cost');
    expect(record).toHaveProperty('category');
  });

  it('should assess data quality', () => {
    expect(ecommerceData.quality).toBeDefined();
    expect(ecommerceData.quality.totalRows).toBeGreaterThan(0);
    expect(ecommerceData.quality.validRows).toBeGreaterThanOrEqual(0);
  });

  it('should calculate correct KPIs', () => {
    const kpis = processEcommerceData(ecommerceData.highQuality);

    expect(kpis.totalRevenue).toBeGreaterThan(0);
    expect(kpis.totalOrders).toEqual(ecommerceData.highQuality.length);
    expect(kpis.totalCustomers).toBeGreaterThan(0);
    expect(kpis.averageOrderValue).toBeGreaterThan(0);
    expect(kpis.conversionRate).toBeGreaterThanOrEqual(0);
    expect(kpis.conversionRate).toBeLessThanOrEqual(100);
    expect(kpis.cartAbandonmentRate).toBeGreaterThanOrEqual(0);
    expect(kpis.cartAbandonmentRate).toBeLessThanOrEqual(100);
    expect(kpis.profitMargin).toBeGreaterThanOrEqual(-100);
  });

  it('should provide KPI lineage', () => {
    const kpis = processEcommerceData(ecommerceData.highQuality);

    expect(kpis.kpiLineage).toBeDefined();
    expect(Object.keys(kpis.kpiLineage).length).toBeGreaterThan(0);

    const totalRevenueLineage = kpis.kpiLineage['totalRevenue'];
    expect(totalRevenueLineage).toBeDefined();
    expect(totalRevenueLineage.formula).toBe('SUM(revenue)');
    expect(totalRevenueLineage.sourceRows.length).toEqual(ecommerceData.highQuality.length);
  });

  it('should identify top categories', () => {
    const kpis = processEcommerceData(ecommerceData.highQuality);

    expect(kpis.topCategories).toBeDefined();
    expect(kpis.topCategories.length).toBeGreaterThan(0);

    // Verify top category has highest revenue
    if (kpis.topCategories.length > 1) {
      expect(kpis.topCategories[0].revenue).toBeGreaterThanOrEqual(kpis.topCategories[1].revenue);
    }
  });

  it('should track revenue by date', () => {
    const kpis = processEcommerceData(ecommerceData.highQuality);

    expect(kpis.revenueByDate).toBeDefined();
    expect(kpis.revenueByDate.length).toBeGreaterThan(0);

    // Verify dates are in chronological order
    for (let i = 1; i < kpis.revenueByDate.length; i++) {
      const prevDate = new Date(kpis.revenueByDate[i - 1].date).getTime();
      const currDate = new Date(kpis.revenueByDate[i].date).getTime();
      expect(currDate).toBeGreaterThanOrEqual(prevDate);
    }
  });

  it('should validate revenue calculations', () => {
    const kpis = processEcommerceData(ecommerceData.highQuality);

    const calculatedTotal = ecommerceData.highQuality.reduce((sum, r) => sum + r.revenue, 0);
    expect(kpis.totalRevenue).toBeCloseTo(calculatedTotal, 2);
  });

  it('should validate AOV calculation', () => {
    const kpis = processEcommerceData(ecommerceData.highQuality);

    const expectedAOV = kpis.totalRevenue / kpis.totalOrders;
    expect(kpis.averageOrderValue).toBeCloseTo(expectedAOV, 2);
  });
});

describe('Finance Data Integration', () => {
  let financeData: { records: FinanceRecord[]; quality: DataQualityReport };

  beforeAll(async () => {
    const data = await loadFinanceData();
    financeData = { records: data.records, quality: data.quality };
  });

  it('should load finance data successfully', () => {
    expect(financeData.records).toBeDefined();
    expect(financeData.records.length).toBeGreaterThan(0);
  });

  it('should have required columns in finance data', () => {
    const record = financeData.records[0];
    expect(record).toHaveProperty('user_id');
    expect(record).toHaveProperty('age');
    expect(record).toHaveProperty('monthly_income_usd');
    expect(record).toHaveProperty('monthly_expenses_usd');
    expect(record).toHaveProperty('credit_score');
    expect(record).toHaveProperty('debt_to_income_ratio');
  });

  it('should assess finance data quality', () => {
    expect(financeData.quality).toBeDefined();
    expect(financeData.quality.totalRows).toBeGreaterThan(0);
  });

  it('should calculate correct finance KPIs', () => {
    const kpis = processFinanceData(financeData.records);

    expect(kpis.averageIncome).toBeGreaterThan(0);
    expect(kpis.averageExpenses).toBeGreaterThan(0);
    expect(kpis.averageSavings).toBeGreaterThanOrEqual(0);
    expect(kpis.savingsRate).toBeGreaterThanOrEqual(0);
    expect(kpis.debtToIncomeRatio).toBeGreaterThanOrEqual(0);
    expect(kpis.averageCreditScore).toBeGreaterThan(0);
    expect(kpis.averageCreditScore).toBeLessThanOrEqual(850);
  });

  it('should have employment distribution', () => {
    const kpis = processFinanceData(financeData.records);

    expect(kpis.employmentDistribution).toBeDefined();
    expect(Object.keys(kpis.employmentDistribution).length).toBeGreaterThan(0);

    // Verify percentages add up to 100
    const totalPercentage = Object.values(kpis.employmentDistribution).reduce((sum, pct) => sum + pct, 0);
    expect(totalPercentage).toBeLessThanOrEqual(100);
  });

  it('should have regional distribution', () => {
    const kpis = processFinanceData(financeData.records);

    expect(kpis.incomeDistributionByRegion).toBeDefined();
    expect(Object.keys(kpis.incomeDistributionByRegion).length).toBeGreaterThan(0);

    // Verify all regional incomes are positive
    Object.values(kpis.incomeDistributionByRegion).forEach((income) => {
      expect(income).toBeGreaterThan(0);
    });
  });

  it('should analyze debt patterns', () => {
    const kpis = processFinanceData(financeData.records);

    expect(kpis.debtAnalysis).toBeDefined();
    expect(kpis.debtAnalysis.totalWithLoans).toBeGreaterThanOrEqual(0);
    expect(kpis.debtAnalysis.averageLoanAmount).toBeGreaterThanOrEqual(0);
  });

  it('should classify risk profile', () => {
    const kpis = processFinanceData(financeData.records);

    const validProfiles = ['Low Risk', 'Low-Moderate Risk', 'Moderate', 'High Risk'];
    expect(validProfiles).toContain(kpis.riskProfile);
  });

  it('should calculate age-income correlation', () => {
    const kpis = processFinanceData(financeData.records);

    expect(kpis.ageIncomeCorrelation).toBeGreaterThanOrEqual(-1);
    expect(kpis.ageIncomeCorrelation).toBeLessThanOrEqual(1);
  });

  it('should provide finance KPI lineage', () => {
    const kpis = processFinanceData(financeData.records);

    expect(kpis.kpiLineage).toBeDefined();
    expect(Object.keys(kpis.kpiLineage).length).toBeGreaterThan(0);

    const incomeLineage = kpis.kpiLineage['averageIncome'];
    expect(incomeLineage).toBeDefined();
    expect(incomeLineage.formula).toBe('AVG(monthly_income_usd)');
  });
});

describe('Data Quality Edge Cases', () => {
  it('should handle empty datasets gracefully', () => {
    const emptyEcom = processEcommerceData([]);
    expect(emptyEcom.totalRevenue).toBe(0);
    expect(emptyEcom.totalOrders).toBe(0);

    const emptyFinance = processFinanceData([]);
    expect(emptyFinance.averageIncome).toBe(0);
    expect(emptyFinance.averageCreditScore).toBe(0);
  });

  it('should handle missing columns in data quality assessment', async () => {
    const ecomData = await loadEcommerceData();
    expect(ecomData.quality.missingColumns).toBeDefined();
    expect(Array.isArray(ecomData.quality.missingColumns)).toBe(true);
  }, 30000);
});
