/**
 * E-Commerce Data Processor
 * Calculates KPIs from real e-commerce transaction data
 */

import { EcommerceRecord } from './data-loaders';

export interface EcommerceKPIs {
  totalRevenue: number;
  totalOrders: number;
  totalCustomers: number;
  averageOrderValue: number;
  conversionRate: number;
  cartAbandonmentRate: number;
  customerLifetimeValue: number;
  marketingROI: number;
  profitMargin: number;
  averageSessionsPerOrder: number;
  topCategories: { category: string; revenue: number; orders: number }[];
  revenueByDate: { date: string; revenue: number; orders: number }[];
  kpiLineage: Record<string, EcommerceKPILineage>;
}

export interface EcommerceKPILineage {
  kpiName: string;
  formula: string;
  sourceRows: string[]; // order_ids or record indices
  value: number;
  contributes: Record<string, number>; // Detailed contribution breakdown
}

/**
 * Process e-commerce data and calculate KPIs
 */
export function processEcommerceData(records: EcommerceRecord[]): EcommerceKPIs {
  if (records.length === 0) {
    return getEmptyEcommerceKPIs();
  }

  const lineage: Record<string, EcommerceKPILineage> = {};

  // Basic aggregations
  const totalRevenue = records.reduce((sum, r) => sum + (r.revenue || 0), 0);
  const totalCOGS = records.reduce((sum, r) => sum + (r.cogs || 0), 0);
  const totalMarketingCost = records.reduce((sum, r) => sum + (r.marketing_cost || 0), 0);
  const totalSessions = records.reduce((sum, r) => sum + (r.sessions || 0), 0);
  const totalCartAdditions = records.reduce((sum, r) => sum + (r.cart_additions || 0), 0);

  const uniqueCustomers = new Set(records.map((r) => r.customer_id)).size;
  const totalOrders = records.length;

  // Revenue tracking
  lineage['totalRevenue'] = {
    kpiName: 'Total Revenue',
    formula: 'SUM(revenue)',
    sourceRows: records.map((r) => r.order_id),
    value: totalRevenue,
    contributes: { revenue: totalRevenue },
  };

  // Orders
  lineage['totalOrders'] = {
    kpiName: 'Total Orders',
    formula: 'COUNT(order_id)',
    sourceRows: records.map((r) => r.order_id),
    value: totalOrders,
    contributes: { orders: totalOrders },
  };

  // Average Order Value (AOV)
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;
  lineage['aov'] = {
    kpiName: 'Average Order Value',
    formula: 'SUM(revenue) / COUNT(order_id)',
    sourceRows: records.map((r) => r.order_id),
    value: averageOrderValue,
    contributes: {
      totalRevenue,
      totalOrders,
      aov: averageOrderValue,
    },
  };

  // Conversion Rate (%)
  const conversionRate = totalSessions > 0 ? (totalOrders / totalSessions) * 100 : 0;
  lineage['conversionRate'] = {
    kpiName: 'Conversion Rate',
    formula: '(COUNT(order_id) / SUM(sessions)) * 100',
    sourceRows: records.map((r) => r.order_id),
    value: conversionRate,
    contributes: {
      orders: totalOrders,
      sessions: totalSessions,
      percentage: conversionRate,
    },
  };

  // Cart Abandonment Rate (%)
  const cartAbandonmentRate =
    totalSessions > 0 ? ((totalSessions - totalCartAdditions) / totalSessions) * 100 : 0;
  lineage['cartAbandonment'] = {
    kpiName: 'Cart Abandonment Rate',
    formula: '((SUM(sessions) - SUM(cart_additions)) / SUM(sessions)) * 100',
    sourceRows: records.map((r) => r.order_id),
    value: cartAbandonmentRate,
    contributes: {
      sessions: totalSessions,
      cartAdditions: totalCartAdditions,
      percentage: cartAbandonmentRate,
    },
  };

  // Customer Lifetime Value (LTV)
  const customerLTV = uniqueCustomers > 0 ? totalRevenue / uniqueCustomers : 0;
  lineage['ltv'] = {
    kpiName: 'Customer Lifetime Value',
    formula: 'SUM(revenue) / COUNT(DISTINCT customer_id)',
    sourceRows: records.map((r) => r.order_id),
    value: customerLTV,
    contributes: {
      totalRevenue,
      uniqueCustomers,
      ltv: customerLTV,
    },
  };

  // Profit Margin (%)
  const totalProfit = totalRevenue - totalCOGS;
  const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
  lineage['profitMargin'] = {
    kpiName: 'Profit Margin',
    formula: '((SUM(revenue) - SUM(cogs)) / SUM(revenue)) * 100',
    sourceRows: records.map((r) => r.order_id),
    value: profitMargin,
    contributes: {
      revenue: totalRevenue,
      cogs: totalCOGS,
      profit: totalProfit,
      percentage: profitMargin,
    },
  };

  // Marketing ROI (%)
  const marketingROI =
    totalMarketingCost > 0 ? ((totalRevenue - totalMarketingCost) / totalMarketingCost) * 100 : 0;
  lineage['marketingROI'] = {
    kpiName: 'Marketing ROI',
    formula: '((SUM(revenue) - SUM(marketing_cost)) / SUM(marketing_cost)) * 100',
    sourceRows: records.map((r) => r.order_id),
    value: marketingROI,
    contributes: {
      revenue: totalRevenue,
      marketingCost: totalMarketingCost,
      roi: marketingROI,
    },
  };

  // Average Sessions per Order
  const averageSessionsPerOrder = totalOrders > 0 ? totalSessions / totalOrders : 0;
  lineage['avgSessionsPerOrder'] = {
    kpiName: 'Average Sessions per Order',
    formula: 'SUM(sessions) / COUNT(order_id)',
    sourceRows: records.map((r) => r.order_id),
    value: averageSessionsPerOrder,
    contributes: {
      sessions: totalSessions,
      orders: totalOrders,
      average: averageSessionsPerOrder,
    },
  };

  // Top Categories
  const categoryMap: Record<string, { revenue: number; orders: number }> = {};
  records.forEach((r) => {
    if (!categoryMap[r.category]) {
      categoryMap[r.category] = { revenue: 0, orders: 0 };
    }
    categoryMap[r.category].revenue += r.revenue || 0;
    categoryMap[r.category].orders += 1;
  });

  const topCategories = Object.entries(categoryMap)
    .map(([category, data]) => ({ category, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // Revenue by Date
  const dateMap: Record<string, { revenue: number; orders: number }> = {};
  records.forEach((r) => {
    if (!dateMap[r.date]) {
      dateMap[r.date] = { revenue: 0, orders: 0 };
    }
    dateMap[r.date].revenue += r.revenue || 0;
    dateMap[r.date].orders += 1;
  });

  const revenueByDate = Object.entries(dateMap)
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  return {
    totalRevenue,
    totalOrders,
    totalCustomers: uniqueCustomers,
    averageOrderValue,
    conversionRate,
    cartAbandonmentRate,
    customerLifetimeValue: customerLTV,
    marketingROI,
    profitMargin,
    averageSessionsPerOrder,
    topCategories,
    revenueByDate,
    kpiLineage: lineage,
  };
}

/**
 * Get empty KPIs structure
 */
function getEmptyEcommerceKPIs(): EcommerceKPIs {
  return {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    averageOrderValue: 0,
    conversionRate: 0,
    cartAbandonmentRate: 0,
    customerLifetimeValue: 0,
    marketingROI: 0,
    profitMargin: 0,
    averageSessionsPerOrder: 0,
    topCategories: [],
    revenueByDate: [],
    kpiLineage: {},
  };
}

/**
 * Get KPI details with source data
 */
export function getKPIWithSource(
  kpiName: string,
  records: EcommerceRecord[],
  kpis: EcommerceKPIs
): {
  kpi: string;
  value: number;
  description: string;
  sourceData: EcommerceRecord[];
  lineage: EcommerceKPILineage | null;
} {
  const lineage = kpis.kpiLineage[kpiName] || null;
  const sourceOrderIds = lineage?.sourceRows || [];
  const sourceData = records.filter((r) => sourceOrderIds.includes(r.order_id));

  return {
    kpi: kpiName,
    value: kpis[kpiName as keyof EcommerceKPIs] as number,
    description: lineage?.kpiName || kpiName,
    sourceData,
    lineage,
  };
}
