import { createContext, useContext, useEffect, useState, useCallback, useMemo, type ReactNode } from 'react';
import { supabase } from './supabase';
import type { Dimension, Criterion } from '../types/db';
import { DIMENSIONS as STATIC_DIMENSIONS } from '../types';

export interface DimensionView {
  id: string;
  key: string;
  nameAr: string;
  weight: number;
  position: number;
  criteria: string[];
  criteriaIds: Record<string, string>;
}

interface CriteriaContextValue {
  loading: boolean;
  error: string | null;
  dimensions: DimensionView[];
  dimensionsByKey: Record<string, DimensionView>;
  rawDimensions: Dimension[];
  rawCriteria: Criterion[];
  refetch: () => Promise<void>;
}

const FALLBACK: DimensionView[] = Object.entries(STATIC_DIMENSIONS).map(([key, d], i) => ({
  id: `static-${key}`,
  key,
  nameAr: d.nameAr,
  weight: d.weight,
  position: i + 1,
  criteria: [...d.criteria],
  criteriaIds: Object.fromEntries(d.criteria.map((c) => [c, `static-${key}-${c}`])),
}));

const Ctx = createContext<CriteriaContextValue | null>(null);

export function CriteriaProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [rawDimensions, setRawDimensions] = useState<Dimension[]>([]);
  const [rawCriteria, setRawCriteria] = useState<Criterion[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [{ data: dims, error: dimErr }, { data: crits, error: critErr }] = await Promise.all([
      supabase.from('dimensions').select('*').order('position', { ascending: true }),
      supabase.from('criteria').select('*').order('position', { ascending: true }),
    ]);
    if (dimErr || critErr) {
      setError(dimErr?.message || critErr?.message || 'تعذّر تحميل المعايير');
      setRawDimensions([]);
      setRawCriteria([]);
    } else {
      setRawDimensions((dims ?? []) as Dimension[]);
      setRawCriteria((crits ?? []) as Criterion[]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    // Fetch criteria on mount; the loader flips setState internally, which
    // is the documented use case the lint rule complains about.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const dimensions = useMemo<DimensionView[]>(() => {
    const active = rawDimensions.filter((d) => d.is_active);
    // Only fall back to the static set when the DB hasn't loaded yet
    // (rawDimensions is empty). If the admin has deliberately disabled
    // every dimension we must NOT swap in static IDs — those would fail
    // upsert_review's UUID cast and silently break judge submissions.
    if (rawDimensions.length === 0) return FALLBACK;
    if (active.length === 0) return [];
    return active.map((d) => {
      const dimCrits = rawCriteria
        .filter((c) => c.dimension_id === d.id && c.is_active)
        .sort((a, b) => a.position - b.position);
      return {
        id: d.id,
        key: d.key,
        nameAr: d.name_ar,
        weight: Number(d.weight),
        position: d.position,
        criteria: dimCrits.map((c) => c.name_ar),
        criteriaIds: Object.fromEntries(dimCrits.map((c) => [c.name_ar, c.id])),
      };
    });
  }, [rawDimensions, rawCriteria]);

  const dimensionsByKey = useMemo(
    () => Object.fromEntries(dimensions.map((d) => [d.key, d])),
    [dimensions],
  );

  return (
    <Ctx.Provider value={{ loading, error, dimensions, dimensionsByKey, rawDimensions, rawCriteria, refetch: load }}>
      {children}
    </Ctx.Provider>
  );
}

// Co-locating the hook with the provider keeps the criteria boundary in one
// file; the only cost is that Fast Refresh can't hot-swap this file in dev.
// eslint-disable-next-line react-refresh/only-export-components
export function useCriteria(): CriteriaContextValue {
  const v = useContext(Ctx);
  if (!v) throw new Error('useCriteria must be used inside <CriteriaProvider>');
  return v;
}
