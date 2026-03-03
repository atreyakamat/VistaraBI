// Module 5.5 — State Engine Tests
// Integration tests using Prisma against a test database for DashboardState.
// Uses vitest setup with DB transactions.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { hydrateDashboard, persistDashboardState, upsertCard, removeCard } from '../../src/lib/dashboard-state/state-engine';
import db from '../../src/lib/prisma';

const PROJECT_ID = 'test-proj-state-engine';

describe('Dashboard State Engine', () => {

    // Setup: Create a test project
    beforeEach(async () => {
        // Clear any existing state for this test project to avoid conflicts if previous test failed
        await db.dashboardState.deleteMany({ where: { projectId: PROJECT_ID } });
        await db.project.deleteMany({ where: { id: PROJECT_ID } });

        let user = await db.user.findFirst();
        if (!user) {
            user = await db.user.create({ data: { email: 'test-dash@vistarabi.com', name: 'Test User', password: 'password123' } });
        }

        await db.project.create({
            data: { id: PROJECT_ID, name: 'State Test Project', userId: user.id }
        });
    });

    // Teardown: Clean up
    afterEach(async () => {
        await db.dashboardState.deleteMany({ where: { projectId: PROJECT_ID } });
        await db.project.deleteMany({ where: { id: PROJECT_ID } });
    });

    it('Hydrate returns null when no state and no config exist', async () => {
        const state = await hydrateDashboard(PROJECT_ID);
        expect(state).toBeNull();
    });

    it('Persist state creates a new DashboardState with version 1', async () => {
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
        await persistDashboardState(PROJECT_ID, { domain: 'saas' }); // v1
        const updated = await persistDashboardState(PROJECT_ID, { granularity: 'weekly' }); // v2

        expect(updated.version).toBe(2);
        expect(updated.granularity).toBe('weekly');
        expect(updated.domain).toBe('saas'); // Unchanged column should be preserved (though our upsert merges them)
    });

    it('Upsert card creates a new card and links it to state', async () => {
        const state = await persistDashboardState(PROJECT_ID, { domain: 'marketing' });

        const card = await upsertCard(state.id, {
            kpiId: 'kpi-1',
            kpiName: 'Click Rate',
            chartType: 'line',
            layout: { position: 1, colSpan: 1, rowSpan: 1, cardSize: 'sm' },
            groupBy: null,
            filterOverrides: [],
            comparisonMode: null,
            isPinned: false,
            isAIGenerated: false,
            isDrillDown: false,
            parentCardId: null
        });

        expect(card.kpiId).toBe('kpi-1');
        expect(card.layout.position).toBe(1);

        // Verify hydration loads the card
        const hydrated = await hydrateDashboard(PROJECT_ID);
        expect(hydrated!.cards.length).toBe(1);
        expect(hydrated!.cards[0].kpiId).toBe('kpi-1');
    });

    it('Upsert card updates existing card by kpiId (if not a drill-down)', async () => {
        const state = await persistDashboardState(PROJECT_ID, { domain: 'marketing' });

        await upsertCard(state.id, {
            kpiId: 'kpi-1',
            kpiName: 'Click Rate',
            chartType: 'line',
            layout: { position: 1, colSpan: 1, rowSpan: 1, cardSize: 'sm' },
            groupBy: null,
            filterOverrides: [],
            comparisonMode: null,
            isPinned: false,
            isAIGenerated: false,
            isDrillDown: false,
            parentCardId: null
        });

        // Upsert same kpiId, but new chartType
        const updatedCard = await upsertCard(state.id, {
            kpiId: 'kpi-1',
            kpiName: 'Click Rate',
            chartType: 'bar',
            layout: { position: 1, colSpan: 2, rowSpan: 1, cardSize: 'md' },
            groupBy: null,
            filterOverrides: [],
            comparisonMode: null,
            isPinned: false,
            isAIGenerated: false,
            isDrillDown: false,
            parentCardId: null
        });

        expect(updatedCard.chartType).toBe('bar');
        expect(updatedCard.layout.colSpan).toBe(2);

        // Verify it didn't create a duplicate
        const hydrated = await hydrateDashboard(PROJECT_ID);
        expect(hydrated!.cards.length).toBe(1);
    });

    it('Remove card deletes the card from state', async () => {
        const state = await persistDashboardState(PROJECT_ID, { domain: 'marketing' });

        await upsertCard(state.id, {
            kpiId: 'kpi-1',
            kpiName: 'Click Rate',
            chartType: 'line',
            layout: { position: 1, colSpan: 1, rowSpan: 1, cardSize: 'sm' },
            groupBy: null,
            filterOverrides: [],
            comparisonMode: null,
            isPinned: false,
            isAIGenerated: false,
            isDrillDown: false,
            parentCardId: null
        });

        await removeCard(state.id, 'kpi-1');

        const hydrated = await hydrateDashboard(PROJECT_ID);
        expect(hydrated!.cards.length).toBe(0);
    });

});
