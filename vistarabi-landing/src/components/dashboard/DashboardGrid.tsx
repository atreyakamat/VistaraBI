'use client';

import { KPICard } from './KPICard';
import { KPICardData } from './types';

interface DashboardSection {
    id: string;
    name: string;
    kpis: string[];
}

interface DashboardGridProps {
    sections: DashboardSection[];
    kpiData: Map<string, KPICardData>;
}

export function DashboardGrid({ sections, kpiData }: DashboardGridProps) {
    return (
        <div className="space-y-8">
            {sections.map((section) => (
                <div key={section.id} className="space-y-4">
                    <h2 className="text-2xl font-bold text-gray-900 border-b pb-2">
                        {section.name}
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {section.kpis.map((kpiId) => {
                            const data = kpiData.get(kpiId);
                            if (!data) return null;
                            return <KPICard key={kpiId} data={data} />;
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
