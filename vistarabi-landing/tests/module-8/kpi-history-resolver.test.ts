import { describe, it, expect } from 'vitest';
import { resolveForecastHistory, type DashboardKpiExecutionItem } from '../../src/lib/module-8/kpi-history-resolver';

describe('Module 8 KPI history resolver', () => {
  it('picks the best matching KPI series for the target metric', () => {
    const kpis: DashboardKpiExecutionItem[] = [
      {
        kpiId: 'kpi-1',
        kpiName: 'Revenue',
        dataset: [
          { label: '2026-01-01', value: 1000 },
          { label: '2026-01-02', value: 1200 },
        ],
      },
      {
        kpiId: 'kpi-2',
        kpiName: 'Conversion Rate',
        dataset: [
          { label: '2026-01-01', value: 2.5 },
          { label: '2026-01-02', value: 2.8 },
        ],
      },
    ];

    const history = resolveForecastHistory('conversion rate', kpis);

    expect(history).toHaveLength(2);
    expect(history[0].value).toBe(2.5);
    expect(history[1].value).toBe(2.8);
  });

  it('parses numeric strings and ignores invalid values', () => {
    const kpis: DashboardKpiExecutionItem[] = [
      {
        kpiId: 'kpi-1',
        kpiName: 'Revenue',
        dataset: [
          { label: '2026-01-01', value: '$1,250.50' },
          { label: '2026-01-02', value: 'N/A' },
          { label: '2026-01-03', value: '1380' },
        ],
      },
    ];

    const history = resolveForecastHistory('revenue', kpis);

    expect(history).toHaveLength(2);
    expect(history[0].value).toBe(1250.5);
    expect(history[1].value).toBe(1380);
  });

  it('falls back to the richest series if metric match is not found', () => {
    const kpis: DashboardKpiExecutionItem[] = [
      {
        kpiId: 'kpi-short',
        kpiName: 'Sessions',
        dataset: [{ label: '2026-01-01', value: 50 }],
      },
      {
        kpiId: 'kpi-long',
        kpiName: 'Orders',
        dataset: [
          { label: '2026-01-01', value: 10 },
          { label: '2026-01-02', value: 12 },
          { label: '2026-01-03', value: 14 },
        ],
      },
    ];

    const history = resolveForecastHistory('unknown metric', kpis);

    expect(history).toHaveLength(3);
    expect(history[2].value).toBe(14);
  });
});
