/**
 * Services Data Processor — computes KPIs from services_demo.csv records
 */

export interface ServicesRecord {
  project_id: string;
  client_id: string;
  consultant_id: string;
  service_type: string;
  start_date: string;
  end_date: string;
  billable_hours: number;
  non_billable_hours: number;
  hourly_rate: number;
  revenue: number;
  cost: number;
  margin_pct: number;
  client_satisfaction: number;
  project_status: string;
  industry_vertical: string;
}

export interface ServicesKPIs {
  totalRevenue: number;
  avgMarginPct: number;
  avgBillableHours: number;
  utilizationRate: number;
  avgHourlyRate: number;
  avgClientSatisfaction: number;
  totalProjects: number;
  completedProjects: number;
  onTimeRate: number;
  serviceTypeDistribution: Record<string, number>;
  revenueByServiceType: Record<string, number>;
  revenueByVertical: Record<string, number>;
  statusDistribution: Record<string, number>;
  totalCost: number;
  netProfit: number;
}

export function processServicesData(records: ServicesRecord[]): ServicesKPIs {
  if (records.length === 0) return emptyServicesKPIs();

  const n = records.length;
  const completed = records.filter(r => r.project_status === 'Completed');

  const totalRevenue = records.reduce((s, r) => s + (r.revenue || 0), 0);
  const totalCost = records.reduce((s, r) => s + (r.cost || 0), 0);
  const netProfit = totalRevenue - totalCost;

  const avgMargin = records.reduce((s, r) => s + (r.margin_pct || 0), 0) / n;
  const totalBillable = records.reduce((s, r) => s + (r.billable_hours || 0), 0);
  const totalNonBillable = records.reduce((s, r) => s + (r.non_billable_hours || 0), 0);
  const utilizationRate = parseFloat(
    ((totalBillable / Math.max(totalBillable + totalNonBillable, 1)) * 100).toFixed(2)
  );
  const avgRate = records.reduce((s, r) => s + (r.hourly_rate || 0), 0) / n;
  const avgSatisfaction = records.reduce((s, r) => s + (r.client_satisfaction || 0), 0) / n;

  const serviceTypeDist: Record<string, number> = {};
  const revByType: Record<string, number> = {};
  const revByVertical: Record<string, number> = {};
  const statusDist: Record<string, number> = {};

  records.forEach(r => {
    const st = r.service_type || 'Unknown';
    serviceTypeDist[st] = (serviceTypeDist[st] || 0) + 1;
    revByType[st] = (revByType[st] || 0) + (r.revenue || 0);

    const v = r.industry_vertical || 'Unknown';
    revByVertical[v] = (revByVertical[v] || 0) + (r.revenue || 0);

    const s = r.project_status || 'Unknown';
    statusDist[s] = (statusDist[s] || 0) + 1;
  });

  return {
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    avgMarginPct: parseFloat(avgMargin.toFixed(2)),
    avgBillableHours: parseFloat((totalBillable / n).toFixed(1)),
    utilizationRate,
    avgHourlyRate: parseFloat(avgRate.toFixed(2)),
    avgClientSatisfaction: parseFloat(avgSatisfaction.toFixed(2)),
    totalProjects: n,
    completedProjects: completed.length,
    onTimeRate: parseFloat(((completed.length / n) * 100).toFixed(2)),
    serviceTypeDistribution: serviceTypeDist,
    revenueByServiceType: Object.fromEntries(
      Object.entries(revByType).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
    ),
    revenueByVertical: Object.fromEntries(
      Object.entries(revByVertical).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
    ),
    statusDistribution: statusDist,
    totalCost: parseFloat(totalCost.toFixed(2)),
    netProfit: parseFloat(netProfit.toFixed(2)),
  };
}

function emptyServicesKPIs(): ServicesKPIs {
  return {
    totalRevenue: 0, avgMarginPct: 0, avgBillableHours: 0, utilizationRate: 0,
    avgHourlyRate: 0, avgClientSatisfaction: 0, totalProjects: 0, completedProjects: 0,
    onTimeRate: 0, serviceTypeDistribution: {}, revenueByServiceType: {},
    revenueByVertical: {}, statusDistribution: {}, totalCost: 0, netProfit: 0,
  };
}
