// Module 5.5 — State Engine Tests
// Unit tests using Vitest and vitest-mock-extended to mock Prisma.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { mockDeep, mockReset, DeepMockProxy } from 'vitest-mock-extended';
import { PrismaClient } from '@prisma/client';

// ─── Hoisted Mocks ────────────────────────────────────────────────
// We must mock the prisma module before importing anything that uses it.

vi.mock('../../src/lib/prisma', () => ({
    __esModule: true,
    default: mockDeep<PrismaClient>(),
}));

// Now we can safely import the functions and the mocked db
import { hydrateDashboard, persistDashboardState, upsertCard, removeCard } from '../../src/lib/dashboard-state/state-engine';
import db from '../../src/lib/prisma';

const prismaMock = db as unknown as DeepMockProxy<PrismaClient>;

const PROJECT_ID = 'test-proj-state-engine';

describe('Dashboard State Engine', () => {

    beforeEach(() => {
        mockReset(prismaMock);
    });

    it('Hydrate returns null when no state and no config exist', async () => {
        prismaMock.dashboardState.findUnique.mockResolvedValue(null);
        prismaMock.dashboardConfig.findUnique.mockResolvedValue(null);

        const state = await hydrateDashboard(PROJECT_ID);
        expect(state).toBeNull();
    });

    it('Persist state creates a new DashboardState with version 1', async () => {
        const mockState = {
            id: 'state-1',
            projectId: PROJECT_ID,
            domain: 'saas',
            granularity: 'daily',
            version: 1,
            globalFilters: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prismaMock.dashboardState.upsert.mockResolvedValue(mockState as any);

        const state = await persistDashboardState(PROJECT_ID, {
            domain: 'saas',
            granularity: 'daily'
        });

        expect(state.projectId).toBe(PROJECT_ID);
        expect(state.domain).toBe('saas');
        expect(state.granularity).toBe('daily');
        expect(state.version).toBe(1);
    });

    it('Persist state bumps version on update', async () => {
        // Mocking the update behavior (simplified for unit test)
        prismaMock.dashboardState.upsert
            .mockResolvedValueOnce({ id: 'state-1', version: 1, domain: 'saas', granularity: 'daily' } as any)
            .mockResolvedValueOnce({ id: 'state-1', version: 2, domain: 'saas', granularity: 'weekly' } as any);

        await persistDashboardState(PROJECT_ID, { domain: 'saas' }); // v1
        const updated = await persistDashboardState(PROJECT_ID, { granularity: 'weekly' }); // v2

        expect(updated.version).toBe(2);
        expect(updated.granularity).toBe('weekly');
    });

    it('Upsert card creates a new card and links it to state', async () => {
        const mockCard = {
            id: 'card-1',
            stateId: 'state-1',
            kpiId: 'kpi-1',
            kpiName: 'Click Rate',
            chartType: 'line',
            position: 1,
            colSpan: 1,
            rowSpan: 1,
            cardSize: 'sm',
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        prismaMock.dashboardCard.findFirst.mockResolvedValue(null);
        prismaMock.dashboardCard.create.mockResolvedValue(mockCard as any);

        const card = await upsertCard('state-1', {
            kpiId: 'kpi-1',
            kpiName: 'Click Rate',
            chartType: 'line',
            layout: { position: 1, colSpan: 1, rowSpan: 1, cardSize: 'sm' } as any,
            groupBy: null,
            filterOverrides: [],
            comparisonMode: null,
            isPinned: false,
            isAIGenerated: false,
            isDrillDown: false,
            parentCardId: null
        });

        expect(card.kpiId).toBe('kpi-1');
        expect(card.id).toBe('card-1');
    });

    it('Remove card deletes the card from state', async () => {
        prismaMock.dashboardCard.deleteMany.mockResolvedValue({ count: 1 });

        await removeCard('state-1', 'kpi-1');

        expect(prismaMock.dashboardCard.deleteMany).toHaveBeenCalledWith({
            where: { stateId: 'state-1', kpiId: 'kpi-1' }
        });
    });

});
