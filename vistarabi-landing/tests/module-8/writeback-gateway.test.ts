import { describe, it, expect, vi, beforeEach } from 'vitest';
import { POST } from '../../src/app/api/v1/action/execute/route';

// ─── Hoisted Mocks ────────────────────────────────────────────────

const mockProject = vi.hoisted(() => ({
  id: 'proj-1',
  userId: 'user-1',
  name: 'Test Project',
  user: {
    id: 'user-1',
    email: 'test@vistara.com',
    name: 'Test User',
  },
}));

const mockAuditLog = vi.hoisted(() => ({
  id: 'audit-1',
  sessionId: 'proj-1',
  userId: 'user-1',
  intentId: 'action-test-action',
  rawUserQuery: 'EXECUTE_ACTION_GOOGLE_ADS_test-action',
  normalizedUserQuery: 'Write-back execution for GOOGLE_ADS endpoint: /mutate',
  executionStatus: 'COMPLETED',
}));

const mockNotification = vi.hoisted(() => ({
  id: 'notif-1',
  userId: 'user-1',
  type: 'kpi_goal_reached',
  title: 'Executed: Strategy Action on GOOGLE_ADS',
  body: 'Successfully shifted 20% marketing budget.',
  read: false,
}));

const mockDb = vi.hoisted(() => ({
  project: { findUnique: vi.fn() },
  auditLog: { create: vi.fn() },
  notification: { create: vi.fn() },
}));

vi.mock('@/lib/prisma', () => ({
  __esModule: true,
  default: mockDb,
}));

// ─── Helpers ──────────────────────────────────────────────────────

function makeRequest(body: unknown): Request {
  return new Request('http://localhost/api/v1/action/execute', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

// ─── Test Suite ───────────────────────────────────────────────────

describe('Module 8 — Writeback Gateway API Route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockDb.project.findUnique.mockResolvedValue(mockProject);
    mockDb.auditLog.create.mockResolvedValue(mockAuditLog);
    mockDb.notification.create.mockResolvedValue(mockNotification);
  });

  it('returns 400 when JSON body is invalid or empty', async () => {
    const req = new Request('http://localhost/api/v1/action/execute', {
      method: 'POST',
      body: 'invalid-json-content',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Invalid JSON payload');
  });

  it('returns 400 when missing required system or projectId', async () => {
    const res = await POST(makeRequest({ actionId: 'act-1' }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe('Missing required parameters: system and projectId');
  });

  it('returns 404 when project is not found in database', async () => {
    mockDb.project.findUnique.mockResolvedValueOnce(null);
    const res = await POST(makeRequest({ system: 'GOOGLE_ADS', projectId: 'proj-unknown' }));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe('Project not found');
  });

  it('successfully executes google ads writeback and logs audit & notification', async () => {
    const payload = {
      actionId: 'shift-budget',
      system: 'GOOGLE_ADS',
      endpoint: '/v1/mutate',
      payload: { campaignId_target: 'Campaign_B' },
      justification: 'Higher conversions',
      projectId: 'proj-1',
    };

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.detailedMessage).toContain('Successfully shifted 20% marketing budget');
    expect(body.auditId).toBe('audit-1');

    expect(mockDb.project.findUnique).toHaveBeenCalledWith({
      where: { id: 'proj-1' },
      include: { user: true },
    });
    expect(mockDb.auditLog.create).toHaveBeenCalled();
    expect(mockDb.notification.create).toHaveBeenCalled();
  });

  it('successfully executes stripe collections writeback', async () => {
    const payload = {
      actionId: 'escalate-billing',
      system: 'STRIPE',
      endpoint: '/v1/dunning',
      payload: { customer_count: 5 },
      justification: 'Failed invoices',
      projectId: 'proj-1',
    };

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.detailedMessage).toContain('automated Stripe collections workflow');
  });

  it('successfully executes Slack/Resend notifications dispatch', async () => {
    const payload = {
      actionId: 'dispatch-report',
      system: 'RESEND',
      endpoint: '/v1/send',
      payload: {},
      justification: 'Weekly update',
      projectId: 'proj-1',
    };

    const res = await POST(makeRequest(payload));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.detailedMessage).toContain('Dispatched strategic escalation report');
  });
});
