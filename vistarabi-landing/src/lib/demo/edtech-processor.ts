/**
 * EdTech Data Processor — computes KPIs from edtech_demo.csv records
 */

export interface EdTechRecord {
  student_id: string;
  course_id: string;
  course_name: string;
  subject: string;
  enrollment_date: string;
  completion_date: string;
  is_completed: boolean | string;
  score: number;
  progress_pct: number;
  time_spent_hours: number;
  payment_amount: number;
  certificate_issued: boolean | string;
  dropout_reason: string;
  instructor_id: string;
}

export interface EdTechKPIs {
  totalEnrollments: number;
  completionRate: number;
  avgScore: number;
  avgProgressPct: number;
  avgTimeSpent: number;
  avgPayment: number;
  totalRevenue: number;
  certificateRate: number;
  subjectDistribution: Record<string, number>;
  revenueBySubject: Record<string, number>;
  dropoutReasons: Record<string, number>;
  avgScoreBySubject: Record<string, number>;
}

function bool(v: boolean | string): boolean {
  if (typeof v === 'boolean') return v;
  return v === 'true' || v === 'True' || v === '1';
}

export function processEdTechData(records: EdTechRecord[]): EdTechKPIs {
  if (records.length === 0) return emptyEdTechKPIs();

  const n = records.length;
  const completed = records.filter(r => bool(r.is_completed));
  const certified = records.filter(r => bool(r.certificate_issued));

  const completionRate = parseFloat(((completed.length / n) * 100).toFixed(2));
  const certificateRate = parseFloat(((certified.length / n) * 100).toFixed(2));
  const avgScore = completed.reduce((s, r) => s + (r.score || 0), 0) / Math.max(completed.length, 1);
  const avgProgress = records.reduce((s, r) => s + (r.progress_pct || 0), 0) / n;
  const avgTime = records.reduce((s, r) => s + (r.time_spent_hours || 0), 0) / n;
  const totalRevenue = records.reduce((s, r) => s + (r.payment_amount || 0), 0);
  const avgPayment = totalRevenue / n;

  const subjectDist: Record<string, number> = {};
  const revBySubject: Record<string, number> = {};
  const scoreBySubject: Record<string, { total: number; count: number }> = {};

  records.forEach(r => {
    const sub = r.subject || 'Unknown';
    subjectDist[sub] = (subjectDist[sub] || 0) + 1;
    revBySubject[sub] = (revBySubject[sub] || 0) + (r.payment_amount || 0);
  });
  completed.forEach(r => {
    const sub = r.subject || 'Unknown';
    if (!scoreBySubject[sub]) scoreBySubject[sub] = { total: 0, count: 0 };
    scoreBySubject[sub].total += r.score || 0;
    scoreBySubject[sub].count++;
  });

  const dropoutMap: Record<string, number> = {};
  records.filter(r => !bool(r.is_completed)).forEach(r => {
    const reason = r.dropout_reason || 'Unknown';
    if (reason) dropoutMap[reason] = (dropoutMap[reason] || 0) + 1;
  });

  return {
    totalEnrollments: n,
    completionRate,
    avgScore: parseFloat(avgScore.toFixed(2)),
    avgProgressPct: parseFloat(avgProgress.toFixed(1)),
    avgTimeSpent: parseFloat(avgTime.toFixed(1)),
    avgPayment: parseFloat(avgPayment.toFixed(2)),
    totalRevenue: parseFloat(totalRevenue.toFixed(2)),
    certificateRate,
    subjectDistribution: subjectDist,
    revenueBySubject: Object.fromEntries(
      Object.entries(revBySubject).map(([k, v]) => [k, parseFloat(v.toFixed(2))])
    ),
    dropoutReasons: dropoutMap,
    avgScoreBySubject: Object.fromEntries(
      Object.entries(scoreBySubject).map(([k, v]) => [k, parseFloat((v.total / v.count).toFixed(1))])
    ),
  };
}

function emptyEdTechKPIs(): EdTechKPIs {
  return {
    totalEnrollments: 0, completionRate: 0, avgScore: 0, avgProgressPct: 0,
    avgTimeSpent: 0, avgPayment: 0, totalRevenue: 0, certificateRate: 0,
    subjectDistribution: {}, revenueBySubject: {}, dropoutReasons: {}, avgScoreBySubject: {},
  };
}
