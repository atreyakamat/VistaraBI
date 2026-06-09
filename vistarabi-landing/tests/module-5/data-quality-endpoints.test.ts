import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET as getCleaningSummary } from '../../src/app/api/sources/[id]/cleaning-summary/route';
import { GET as getQuality } from '../../src/app/api/sources/[id]/quality/route';
import { GET as getColumnHealth } from '../../src/app/api/sources/[id]/column-health/route';
import { GET as getAuditLog } from '../../src/app/api/sources/[id]/audit-log/route';

// ─── Hoisted Mocks ────────────────────────────────────────────────

const mockUser = vi.hoisted(() => ({
  userId: 'user-1',
  email: 'test@vistara.com',
}));

const mockSource = vi.hoisted(() => ({
  id: 'src-1',
  projectId: 'proj-1',
  fileName: 'transactions.csv',
  fileType: 'csv',
}));

const mockProject = vi.hoisted(() => ({
  id: 'proj-1',
  userId: 'user-1',
  name: 'Test Project',
}));

const mockCleaningLog = vi.hoisted(() => ({
  id: 'log-1',
  sourceId: 'src-1',
  nullsFilled: 5,
  duplicatesRemoved: 2,
  datesNormalized: 10,
  currenciesNormalized: 3,
  textsStandardized: 15,
  emptyColumnsRemoved: 1,
  originalRowCount: 100,
  cleanedRowCount: 98,
}));

const mockCleanedDataset = vi.hoisted(() => ({
  status: 'CLEANED',
  cleanedAt: new Date('2026-06-09T00:00:00Z'),
}));

const mockQuality = vi.hoisted(() => ({
  id: 'qual-1',
  sourceId: 'src-1',
  overallGrade: 'A',
  completenessScore: 98.5,
  consistencyScore: 96.2,
  accuracyScore: 95.0,
  riskLevel: 'LOW',
  totalRecords: 100,
  healthyRecords: 95,
  riskyRecords: 5,
}));

const mockColumnHealths = vi.hoisted(() => [
  {
    id: 'col-1',
    sourceId: 'src-1',
    columnName: 'Revenue',
    healthStatus: 'HEALTHY',
    completeness: 100,
    consistency: 99.2,
    outlierCount: 0,
    uniqueness: 100,
    issues: [],
  },
]);

const mockTransformationAudits = vi.hoisted(() => [
  {
    id: 'audit-1',
    sourceId: 'src-1',
    transformationType: 'NULL_FILL',
    affectedColumn: 'Revenue',
    affectedRowCount: 5,
    beforeValue: 'null',
    afterValue: '0',
    timestamp: new Date('2026-06-09T00:00:00Z'),
  },
]);

const mockDb = vi.hoisted(() => ({
  source: { findUnique: vi.fn() },
  project: { findUnique: vi.fn() },
  cleaningLog: { findUnique: vi.fn() },
  cleanedDataset: { findUnique: vi.fn() },
  qualityIntelligence: { findUnique: vi.fn() },
  columnHealth: { findMany: vi.fn() },
  transformationAudit: { findMany: vi.fn() },
}));

// Mock authentication
vi.mock('@/lib/auth', () => ({
  getCurrentUser: vi.fn().mockResolvedValue(mockUser),
}));

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockDb,
}));

// Mock rate-limiter which is checked elsewhere
vi.mock('@/lib/security/rate-limiter', () => ({
  checkRateLimit: () => ({ success: true }),
  getIdentifier: () => 'test-ip',
  buildRateLimitHeaders: () => ({}),
  RATE_LIMITS: { UPLOAD: {} },
}));

// ─── Helpers ──────────────────────────────────────────────────────

function makeParams(id: string): any {
  return { params: Promise.resolve({ id }) };
}

function makeRequest(): Request {
  return new Request('http://localhost/api/sources/src-1');
}

// ─── Test Suites ──────────────────────────────────────────────────

describe('Module 5 — Data Quality & Lineage API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.source.findUnique.mockResolvedValue(mockSource);
    mockDb.project.findUnique.mockResolvedValue(mockProject);
  });

  describe('GET /api/sources/[id]/cleaning-summary', () => {
    it('returns 200 with the formatted cleaning statistics', async () => {
      mockDb.cleaningLog.findUnique.mockResolvedValue(mockCleaningLog);
      mockDb.cleanedDataset.findUnique.mockResolvedValue(mockCleanedDataset);

      const res = await getCleaningSummary(makeRequest() as any, makeParams('src-1'));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.summary.stats.nullsFilled).toBe(5);
      expect(body.summary.stats.originalRowCount).toBe(100);
      expect(body.summary.fileName).toBe('transactions.csv');
    });

    it('returns 404 when no cleaning log exists for source', async () => {
      mockDb.cleaningLog.findUnique.mockResolvedValue(null);
      const res = await getCleaningSummary(makeRequest() as any, makeParams('src-1'));
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/sources/[id]/quality', () => {
    it('returns 200 with quality scores and risk levels', async () => {
      mockDb.qualityIntelligence.findUnique.mockResolvedValue(mockQuality);

      const res = await getQuality(makeRequest() as any, makeParams('src-1'));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.quality.overallGrade).toBe('A');
      expect(body.quality.riskLevel).toBe('LOW');
      expect(body.quality.completenessScore).toBe(98.5);
    });

    it('returns 404 if no quality intelligence is found', async () => {
      mockDb.qualityIntelligence.findUnique.mockResolvedValue(null);
      const res = await getQuality(makeRequest() as any, makeParams('src-1'));
      expect(res.status).toBe(404);
    });
  });

  describe('GET /api/sources/[id]/column-health', () => {
    it('returns 200 with per-column health details', async () => {
      mockDb.columnHealth.findMany.mockResolvedValue(mockColumnHealths);

      const res = await getColumnHealth(makeRequest() as any, makeParams('src-1'));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.columnHealths).toHaveLength(1);
      expect(body.columnHealths[0].columnName).toBe('Revenue');
      expect(body.columnHealths[0].healthStatus).toBe('HEALTHY');
    });
  });

  describe('GET /api/sources/[id]/audit-log', () => {
    it('returns 200 with step-by-step transformation records', async () => {
      mockDb.transformationAudit.findMany.mockResolvedValue(mockTransformationAudits);

      const res = await getAuditLog(makeRequest() as any, makeParams('src-1'));
      expect(res.status).toBe(200);

      const body = await res.json();
      expect(body.auditLog).toHaveLength(1);
      expect(body.auditLog[0].transformationType).toBe('NULL_FILL');
      expect(body.auditLog[0].affectedColumn).toBe('Revenue');
    });
  });
});
