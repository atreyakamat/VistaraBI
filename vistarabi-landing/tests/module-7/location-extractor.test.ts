import { describe, expect, it } from 'vitest';
import { extractLocationsFromSourceData, fallbackLocationsForDomain } from '@/lib/module-7/location-extractor';

describe('module-7/location-extractor', () => {
    it('extracts unique location names from location-like columns', () => {
        const locations = extractLocationsFromSourceData([
            {
                columns: ['city', 'sales'],
                data: [
                    { city: 'mumbai', sales: 100 },
                    { city: 'Delhi', sales: 80 },
                    { city: 'mumbai', sales: 95 },
                ],
            },
            {
                columns: ['store_id'],
                data: [{ store_id: 101 }, { store_id: 202 }],
            },
        ]);

        expect(locations).toEqual(['Mumbai', 'Delhi', 'Store 101', 'Store 202']);
    });

    it('ignores invalid placeholder values and limits output size', () => {
        const locations = extractLocationsFromSourceData([
            {
                columns: ['region'],
                data: [
                    { region: 'NA' },
                    { region: 'unknown' },
                    { region: '' },
                    { region: 'north' },
                    { region: 'south' },
                    { region: 'east' },
                    { region: 'west' },
                    { region: 'central' },
                    { region: 'tier-1' },
                    { region: 'tier-2' },
                    { region: 'tier-3' },
                ],
            },
        ]);

        expect(locations).toEqual(['North', 'South', 'East', 'West', 'Central', 'Tier 1', 'Tier 2', 'Tier 3']);
    });

    it('returns retail fallback labels for retail domain', () => {
        expect(fallbackLocationsForDomain('retail')).toEqual(['Store Alpha', 'Store Beta', 'Store Gamma']);
    });
});

