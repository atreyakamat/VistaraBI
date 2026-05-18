/**
 * SaaS Data Processor — computes KPIs from saas_demo.csv records
 */

export interface SaaSRecord {
  subscription_id: string;
  customer_id: string;
  plan_name: string;
  mrr: number;
  arr: number;
  signup_date: string;
  churn_date: string;
  is_churned: boolean | string;
  cac: number;
  ltv: number;
  trial_converted: boolean | string;
  billing_cycle: string;
  seats: number;
  feature_tier: string;
  referral_source: string;
}

export interface SaaSKPIs {
  totalMRR: number;
  totalARR: number;
  churnRate: number;
  avgCAC: number;
  avgLTV: number;
  ltvCacRatio: number;
  trialConversionRate: number;
  netRevenueRetention: number;
  planDistribution: Record<string, number>;
  mrrByPlan: Record<string, number>;
  channelDistribution: Record<string, number>;
  avgSeats: number;
  totalCustomers: number;
  churned: number;
}

function bool(v: boolean | string): boolean {
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === 'True' || v === '1';
}

export function processSaaSData(records: SaaSRecord[]): SaaSKPIs {
  if (records.length === 0) return emptySaaSKPIs();

  const n = records.length;
  const churned = records.filter(r => bool(r.is_churned));
  const churnRate = parseFloat(((churned.length / n) * 100).toFixed(2));

  const totalMRR = records.reduce((s, r) => s + (r.mrr || 0), 0);
  const totalARR = records.reduce((s, r) => s + (r.arr || 0), 0);
  const avgCAC = records.reduce((s, r) => s + (r.cac || 0), 0) / n;
  const avgLTV = records.reduce((s, r) => s + (r.ltv || 0), 0) / n;
  const ltvCacRatio = avgCAC > 0 ? parseFloat((avgLTV / avgCAC).toFixed(2)) : 0;
  const converted = records.filter(r => bool(r.trial_converted));
  const trialConversionRate = parseFloat(((converted.length / n) * 100).toFixed(2));
  const avgSeats = parseFloat((records.reduce((s, r) => s + (r.seats || 0), 0) / n).toFixed(1));

  // Churn MRR
  const churnedMRR = churned.reduce((s, r) => s + (r.mrr || 0), 0);
  const netRevenueRetention = parseFloat((((totalMRR - churnedMRR) / Math.max(totalMRR, 1)) * 100).toFixed(2));

  // Plan distribution
  const planDist: Record<string, number> = {};
  const mrrByPlan: Record<string, number> = {};
  records.forEach(r => {
    const p = r.plan_name || 'Unknown';
    planDist[p] = (planDist[p] || 0) + 1;
    mrrByPlan[p] = (mrrByPlan[p] || 0) + (r.mrr || 0);
  });

  const channelDist: Record<string, number> = {};
  records.forEach(r => {
    const ch = r.referral_source || 'Unknown';
    channelDist[ch] = (channelDist[ch] || 0) + 1;
  });

  return {
    totalMRR: parseFloat(totalMRR.toFixed(2)),
    totalARR: parseFloat(totalARR.toFixed(2)),
    churnRate,
    avgCAC: parseFloat(avgCAC.toFixed(2)),
    avgLTV: parseFloat(avgLTV.toFixed(2)),
    ltvCacRatio,
    trialConversionRate,
    netRevenueRetention,
    planDistribution: planDist,
    mrrByPlan: Object.fromEntries(Object.entries(mrrByPlan).map(([k,v]) => [k, parseFloat(v.toFixed(2))])),
    channelDistribution: channelDist,
    avgSeats,
    totalCustomers: n,
    churned: churned.length,
  };
}

function emptySaaSKPIs(): SaaSKPIs {
  return {
    totalMRR: 0, totalARR: 0, churnRate: 0, avgCAC: 0, avgLTV: 0,
    ltvCacRatio: 0, trialConversionRate: 0, netRevenueRetention: 0,
    planDistribution: {}, mrrByPlan: {}, channelDistribution: {},
    avgSeats: 0, totalCustomers: 0, churned: 0,
  };
}
