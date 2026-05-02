/**
 * Hook for loading real data in React components
 */

'use client';

import { useEffect, useState } from 'react';
import type { EcommerceRecord, FinanceRecord, DataQualityReport } from '@/lib/demo/data-loaders';
import type { EcommerceKPIs } from '@/lib/demo/ecommerce-processor';
import type { FinanceKPIs } from '@/lib/demo/finance-processor';

export interface RealDataState {
  ecommerce: {
    data: EcommerceRecord[] | null;
    kpis: EcommerceKPIs | null;
    quality: DataQualityReport | null;
    loading: boolean;
    error: string | null;
  };
  finance: {
    data: FinanceRecord[] | null;
    kpis: FinanceKPIs | null;
    quality: DataQualityReport | null;
    loading: boolean;
    error: string | null;
  };
  isLiveMode: boolean;
}

export function useRealData() {
  const [state, setState] = useState<RealDataState>({
    ecommerce: {
      data: null,
      kpis: null,
      quality: null,
      loading: false,
      error: null,
    },
    finance: {
      data: null,
      kpis: null,
      quality: null,
      loading: false,
      error: null,
    },
    isLiveMode: false,
  });

  useEffect(() => {
    const loadData = async () => {
      // Load E-Commerce data
      setState((prev) => ({
        ...prev,
        ecommerce: { ...prev.ecommerce, loading: true },
      }));

      try {
        const ecommerceRes = await fetch('/api/data/ecommerce');
        if (ecommerceRes.ok) {
          const ecommerceData = await ecommerceRes.json();
          setState((prev) => ({
            ...prev,
            ecommerce: {
              data: ecommerceData.records,
              kpis: ecommerceData.kpis,
              quality: ecommerceData.quality,
              loading: false,
              error: null,
            },
            isLiveMode: true,
          }));
        } else {
          throw new Error('Failed to load E-Commerce data');
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          ecommerce: {
            ...prev.ecommerce,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }

      // Load Finance data
      setState((prev) => ({
        ...prev,
        finance: { ...prev.finance, loading: true },
      }));

      try {
        const financeRes = await fetch('/api/data/finance');
        if (financeRes.ok) {
          const financeData = await financeRes.json();
          setState((prev) => ({
            ...prev,
            finance: {
              data: financeData.records,
              kpis: financeData.kpis,
              quality: financeData.quality,
              loading: false,
              error: null,
            },
          }));
        } else {
          throw new Error('Failed to load Finance data');
        }
      } catch (error) {
        setState((prev) => ({
          ...prev,
          finance: {
            ...prev.finance,
            loading: false,
            error: error instanceof Error ? error.message : 'Unknown error',
          },
        }));
      }
    };

    loadData();
  }, []);

  return state;
}

export interface DataInspectionState {
  selectedRows: EcommerceRecord[] | FinanceRecord[] | null;
  filters: Record<string, string | number>;
  sortBy: string | null;
  sortDesc: boolean;
  visibleColumns: string[];
}
