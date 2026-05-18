/**
 * Healthcare Data Processor — computes KPIs from healthcare_demo.csv records
 */

export interface HealthcareRecord {
  patient_id: string;
  visit_id: string;
  department: string;
  admission_date: string;
  discharge_date: string;
  los_days: number;
  diagnosis_code: string;
  treatment_cost: number;
  insurance_type: string;
  readmitted_30d: boolean | string;
  patient_satisfaction: number;
  wait_time_minutes: number;
  bed_occupancy: number;
  staff_id: string;
  outcome: string;
}

export interface HealthcareKPIs {
  avgLengthOfStay: number;
  avgTreatmentCost: number;
  readmissionRate: number;
  avgPatientSatisfaction: number;
  avgWaitTime: number;
  avgBedOccupancy: number;
  departmentDistribution: Record<string, number>;
  costByDepartment: Record<string, number>;
  insuranceDistribution: Record<string, number>;
  outcomeDistribution: Record<string, number>;
  totalVisits: number;
  totalRevenue: number;
}

function bool(v: boolean | string): boolean {
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === 'True' || v === '1';
}

export function processHealthcareData(records: HealthcareRecord[]): HealthcareKPIs {
  if (records.length === 0) return emptyHealthcareKPIs();

  const n = records.length;
  const readmitted = records.filter(r => bool(r.readmitted_30d));

  const avgLOS = records.reduce((s, r) => s + (r.los_days || 0), 0) / n;
  const avgCost = records.reduce((s, r) => s + (r.treatment_cost || 0), 0) / n;
  const totalRevenue = records.reduce((s, r) => s + (r.treatment_cost || 0), 0);
  const readmissionRate = parseFloat(((readmitted.length / n) * 100).toFixed(2));
  const avgSatisfaction = records.reduce((s, r) => s + (r.patient_satisfaction || 0), 0) / n;
  const avgWait = records.reduce((s, r) => s + (r.wait_time_minutes || 0), 0) / n;
  const avgOccupancy = records.reduce((s, r) => s + (r.bed_occupancy || 0), 0) / n;

  const deptDist: Record<string, number> = {};
  const costByDept: Record<string, { total: number; count: number }> = {};
  records.forEach(r => {
    const d = r.department || 'Unknown';
    deptDist[d] = (deptDist[d] || 0) + 1;
    if (!costByDept[d]) costByDept[d] = { total: 0, count: 0 };
    costByDept[d].total += r.treatment_cost || 0;
    costByDept[d].count++;
  });

  const insuranceDist: Record<string, number> = {};
  records.forEach(r => {
    const ins = r.insurance_type || 'Unknown';
    insuranceDist[ins] = (insuranceDist[ins] || 0) + 1;
  });

  const outcomeDist: Record<string, number> = {};
  records.forEach(r => {
    const o = r.outcome || 'Unknown';
    outcomeDist[o] = (outcomeDist[o] || 0) + 1;
  });

  return {
    avgLengthOfStay: parseFloat(avgLOS.toFixed(1)),
    avgTreatmentCost: parseFloat(avgCost.toFixed(2)),
    readmissionRate,
    avgPatientSatisfaction: parseFloat(avgSatisfaction.toFixed(2)),
    avgWaitTime: parseFloat(avgWait.toFixed(1)),
    avgBedOccupancy: parseFloat((avgOccupancy * 100).toFixed(1)),
    departmentDistribution: deptDist,
    costByDepartment: Object.fromEntries(
      Object.entries(costByDept).map(([k, v]) => [k, parseFloat((v.total / v.count).toFixed(2))])
    ),
    insuranceDistribution: insuranceDist,
    outcomeDistribution: outcomeDist,
    totalVisits: n,
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
  };
}

function emptyHealthcareKPIs(): HealthcareKPIs {
  return {
    avgLengthOfStay: 0, avgTreatmentCost: 0, readmissionRate: 0,
    avgPatientSatisfaction: 0, avgWaitTime: 0, avgBedOccupancy: 0,
    departmentDistribution: {}, costByDepartment: {}, insuranceDistribution: {},
    outcomeDistribution: {}, totalVisits: 0, totalRevenue: 0,
  };
}
