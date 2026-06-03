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

function normalizeRecord(raw: any): SaaSRecord {
  // Map common alternative headers to canonical ones
  const mapping: Record<string, string> = {
    'trial_conversion': 'trial_converted',
    'is_churned': 'is_churned',
    'churned': 'is_churned',
    'customer': 'customer_id',
    'customer_id': 'customer_id',
    'mrr': 'mrr',
    'arr': 'arr',
    'signup_date': 'signup_date',
    'churn_date': 'churn_date',
    'cac': 'cac',
    'ltv': 'ltv',
    'billing_cycle': 'billing_cycle',
    'seats': 'seats',
    'plan': 'plan_name',
    'plan_name': 'plan_name',
    'referral_source': 'referral_source',
  };

  const out: any = {};
  for (const key of Object.keys(raw)) {
    const lower = key.toLowerCase();
    const canonical = mapping[lower] || lower;
    out[canonical] = raw[key];
  }

  // Ensure numeric fields are numbers
  out.mrr = Number(out.mrr || 0);
  out.arr = Number(out.arr || 0);
  out.cac = Number(out.cac || 0);
  out.ltv = Number(out.ltv || 0);
  out.seats = Number(out.seats || 0);

  // Booleans normalization
  out.is_churned = out.is_churned === true || String(out.is_churned).toLowerCase() === 'true' || String(out.is_churned) === '1';
  out.trial_converted = out.trial_converted === true || String(out.trial_converted).toLowerCase() === 'true' || String(out.trial_converted) === '1';

  // Strings
  out.plan_name = out.plan_name || 'Unknown';
  out.referral_source = out.referral_source || 'Unknown';

  // IDs
  out.subscription_id = out.subscription_id || `${out.customer_id || 'unknown'}-${Math.random().toString(36).slice(2,8)}`;
  out.customer_id = out.customer_id || 'unknown';

  return out as SaaSRecord;
}

export function processSaaSData(records: any[]): SaaSKPIs {
  if (!Array.isArray(records) || records.length === 0) return emptySaaSKPIs();

  // Normalize records and capture a few warnings if fields were missing
  const normalized: SaaSRecord[] = records.map(r => normalizeRecord(r));

  // Now reuse the original logic but operating on normalized records
  const n = normalized.length;
  const churned = normalized.filter(r => bool(r.is_churned));
  const churnRate = parseFloat(((churned.length / n) * 100).toFixed(2));

  const totalMRR = normalized.reduce((s, r) => s + (r.mrr || 0), 0);
  const totalARR = normalized.reduce((s, r) => s + (r.arr || 0), 0);
  const avgCAC = normalized.reduce((s, r) => s + (r.cac || 0), 0) / n;
  const avgLTV = normalized.reduce((s, r) => s + (r.ltv || 0), 0) / n;
  const ltvCacRatio = avgCAC > 0 ? parseFloat((avgLTV / avgCAC).toFixed(2)) : 0;
  const converted = normalized.filter(r => bool(r.trial_converted));
  const trialConversionRate = parseFloat(((converted.length / n) * 100).toFixed(2));
  const avgSeats = parseFloat((normalized.reduce((s, r) => s + (r.seats || 0), 0) / n).toFixed(1));

  // Churn MRR
  const churnedMRR = churned.reduce((s, r) => s + (r.mrr || 0), 0);
  const netRevenueRetention = parseFloat((((totalMRR - churnedMRR) / Math.max(totalMRR, 1)) * 100).toFixed(2));

  // Plan distribution
  const planDist: Record<string, number> = {};
  const mrrByPlan: Record<string, number> = {};
  normalized.forEach(r => {
    const p = r.plan_name || 'Unknown';
    planDist[p] = (planDist[p] || 0) + 1;
    mrrByPlan[p] = (mrrByPlan[p] || 0) + (r.mrr || 0);
  });

  const channelDist: Record<string, number> = {};
  normalized.forEach(r => {
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
