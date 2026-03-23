import type { KpiDataPoint } from './types';

export interface DashboardKpiDatasetPoint {
  date?: string;
  label?: string;
  value?: number | string | null;
}

export interface DashboardKpiExecutionItem {
  kpiId: string;
  kpiName: string;
  dataset?: DashboardKpiDatasetPoint[];
}

const METRIC_STOP_WORDS = new Set([
  'kpi',
  'metric',
  'total',
  'overall',
  'value',
  'rate',
  'count',
  'amount',
]);

function normalizeMetricText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function tokenizeMetric(text: string): string[] {
  return normalizeMetricText(text)
    .split(/\s+/)
    .filter(Boolean)
    .filter((token) => !METRIC_STOP_WORDS.has(token));
}

function metricMatchScore(targetMetric: string, candidateMetric: string): number {
  const target = normalizeMetricText(targetMetric);
  const candidate = normalizeMetricText(candidateMetric);

  if (!target || target === 'unknown') return 0;
  if (!candidate) return 0;
  if (target === candidate) return 100;
  if (candidate.includes(target) || target.includes(candidate)) return 80;

  const targetTokens = tokenizeMetric(targetMetric);
  const candidateTokens = tokenizeMetric(candidateMetric);
  if (targetTokens.length === 0 || candidateTokens.length === 0) return 0;

  const candidateTokenSet = new Set(candidateTokens);
  const overlapCount = targetTokens.filter((token) => candidateTokenSet.has(token)).length;
  if (overlapCount === 0) return 0;

  const targetCoverage = overlapCount / targetTokens.length;
  const candidateCoverage = overlapCount / candidateTokens.length;
  const allTargetTokensMatched = overlapCount === targetTokens.length;

  return Math.round((targetCoverage * 70) + (candidateCoverage * 20) + (allTargetTokensMatched ? 10 : 0));
}

function toIsoDate(maybeDate: string): string | null {
  const raw = maybeDate.trim();
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}/.test(raw)) {
    return raw.slice(0, 10);
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed.toISOString().slice(0, 10);
}

function parseNumericValue(raw: number | string | null | undefined): number | null {
  if (typeof raw === 'number') {
    return Number.isFinite(raw) ? raw : null;
  }

  if (typeof raw === 'string') {
    const cleaned = raw.replace(/[^0-9.-]/g, '');
    if (!cleaned || cleaned === '-' || cleaned === '.' || cleaned === '-.') {
      return null;
    }
    const parsed = Number(cleaned);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function buildHistoryFromDataset(
  dataset: DashboardKpiDatasetPoint[],
  nowMs: number
): KpiDataPoint[] {
  const total = dataset.length;
  const history: KpiDataPoint[] = [];

  for (let index = 0; index < total; index++) {
    const point = dataset[index];
    const numericValue = parseNumericValue(point.value);
    if (numericValue === null) continue;

    const dateSource =
      typeof point.date === 'string'
        ? point.date
        : typeof point.label === 'string'
          ? point.label
          : '';

    const resolvedDate = toIsoDate(dateSource);
    const fallbackDate = new Date(nowMs - ((total - index - 1) * 86400000)).toISOString().slice(0, 10);

    history.push({
      date: resolvedDate ?? fallbackDate,
      value: numericValue,
    });
  }

  return history.sort((a, b) => a.date.localeCompare(b.date));
}

export function resolveForecastHistory(
  targetMetric: string,
  kpis: DashboardKpiExecutionItem[],
  nowMs: number = Date.now()
): KpiDataPoint[] {
  const candidates = kpis
    .map((kpi) => ({
      kpi,
      history: buildHistoryFromDataset(kpi.dataset ?? [], nowMs),
      score: metricMatchScore(targetMetric, kpi.kpiName),
    }))
    .filter((candidate) => candidate.history.length > 0);

  if (candidates.length === 0) return [];

  const withMetricMatch = candidates
    .filter((candidate) => candidate.score > 0)
    .sort((a, b) => b.score - a.score || b.history.length - a.history.length);

  if (withMetricMatch.length > 0) {
    return withMetricMatch[0].history;
  }

  // If metric matching fails, use the richest available KPI series
  // so Module 8 can still produce a deterministic forecast.
  return candidates.sort((a, b) => b.history.length - a.history.length)[0].history;
}
