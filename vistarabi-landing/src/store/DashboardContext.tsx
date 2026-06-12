'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';
import type { DashboardFilters } from '@/components/dashboard/FilterBar';

interface DashboardState {
    sidebarOpen: boolean;
    setSidebarOpen: (open: boolean) => void;
    filters: DashboardFilters;
    setFilters: (filters: DashboardFilters) => void;
}

const DashboardContext = createContext<DashboardState | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [filters, setFilters] = useState<DashboardFilters>({
        granularity: 'monthly',
        dateRange: '90d',
    });

    return (
        <DashboardContext.Provider value={{ sidebarOpen, setSidebarOpen, filters, setFilters }}>
            {children}
        </DashboardContext.Provider>
    );
}

export function useDashboardContext() {
    const context = useContext(DashboardContext);
    if (context === undefined) {
        throw new Error('useDashboardContext must be used within a DashboardProvider');
    }
    return context;
}
