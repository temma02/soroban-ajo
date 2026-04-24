import { useState, useCallback, useMemo, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Group } from '@/types';
import { FilterState, FilterStatus, SortOption } from './useGroupFilters';

export type FilterOperator = 'AND' | 'OR';

export interface SavedFilter {
  id: string;
  name: string;
  filters: FilterState;
  operator: FilterOperator;
  createdAt: string;
}

export interface FilterHistoryEntry {
  filters: FilterState;
  operator: FilterOperator;
  appliedAt: string;
}

const SAVED_FILTERS_KEY = 'ajo_saved_filters';
const FILTER_HISTORY_KEY = 'ajo_filter_history';
const MAX_HISTORY = 10;

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  statusFilter: 'all',
  minAmount: '',
  maxAmount: '',
  cycleLength: '',
  hideFullGroups: false,
  myGroupsOnly: false,
  sortOption: 'newest',
};

function filtersToParams(filters: FilterState, operator: FilterOperator): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.searchQuery) params.set('q', filters.searchQuery);
  if (filters.statusFilter !== 'all') params.set('status', filters.statusFilter);
  if (filters.minAmount !== '') params.set('minAmount', String(filters.minAmount));
  if (filters.maxAmount !== '') params.set('maxAmount', String(filters.maxAmount));
  if (filters.cycleLength !== '') params.set('cycle', String(filters.cycleLength));
  if (filters.hideFullGroups) params.set('hideFull', '1');
  if (filters.myGroupsOnly) params.set('mine', '1');
  if (filters.sortOption !== 'newest') params.set('sort', filters.sortOption);
  if (operator !== 'AND') params.set('op', operator);
  return params;
}

function paramsToFilters(params: URLSearchParams): { filters: FilterState; operator: FilterOperator } {
  return {
    filters: {
      searchQuery: params.get('q') ?? '',
      statusFilter: (params.get('status') as FilterStatus) ?? 'all',
      minAmount: params.get('minAmount') ? Number(params.get('minAmount')) : '',
      maxAmount: params.get('maxAmount') ? Number(params.get('maxAmount')) : '',
      cycleLength: params.get('cycle') ? Number(params.get('cycle')) : '',
      hideFullGroups: params.get('hideFull') === '1',
      myGroupsOnly: params.get('mine') === '1',
      sortOption: (params.get('sort') as SortOption) ?? 'newest',
    },
    operator: (params.get('op') as FilterOperator) ?? 'AND',
  };
}

function isDefaultFilters(filters: FilterState): boolean {
  return (
    filters.searchQuery === '' &&
    filters.statusFilter === 'all' &&
    filters.minAmount === '' &&
    filters.maxAmount === '' &&
    filters.cycleLength === '' &&
    !filters.hideFullGroups &&
    !filters.myGroupsOnly
  );
}

export function useAdvancedFilters(groups: Group[], userId?: string) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<FilterState>(() => {
    const { filters: urlFilters } = paramsToFilters(searchParams);
    return isDefaultFilters(urlFilters) ? DEFAULT_FILTERS : urlFilters;
  });

  const [operator, setOperator] = useState<FilterOperator>(() => {
    const { operator: urlOp } = paramsToFilters(searchParams);
    return urlOp;
  });

  const [savedFilters, setSavedFilters] = useState<SavedFilter[]>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(SAVED_FILTERS_KEY) : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [history, setHistory] = useState<FilterHistoryEntry[]>(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem(FILTER_HISTORY_KEY) : null;
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Sync URL when filters change
  useEffect(() => {
    const params = filtersToParams(filters, operator);
    const newUrl = params.toString() ? `?${params.toString()}` : window.location.pathname;
    router.replace(newUrl, { scroll: false });
  }, [filters, operator, router]);

  // Persist saved filters
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(SAVED_FILTERS_KEY, JSON.stringify(savedFilters));
    }
  }, [savedFilters]);

  // Persist history
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem(FILTER_HISTORY_KEY, JSON.stringify(history));
    }
  }, [history]);

  const updateFilter = useCallback(<K extends keyof FilterState>(key: K, value: FilterState[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = useCallback(() => {
    if (!isDefaultFilters(filters)) {
      setHistory((prev) => [
        { filters, operator, appliedAt: new Date().toISOString() },
        ...prev.slice(0, MAX_HISTORY - 1),
      ]);
    }
    setFilters(DEFAULT_FILTERS);
    setOperator('AND');
  }, [filters, operator]);

  const saveCurrentFilter = useCallback((name: string) => {
    const entry: SavedFilter = {
      id: `${Date.now()}`,
      name,
      filters,
      operator,
      createdAt: new Date().toISOString(),
    };
    setSavedFilters((prev) => [entry, ...prev]);
  }, [filters, operator]);

  const loadSavedFilter = useCallback((id: string) => {
    const saved = savedFilters.find((f) => f.id === id);
    if (!saved) return;
    setHistory((prev) => [
      { filters, operator, appliedAt: new Date().toISOString() },
      ...prev.slice(0, MAX_HISTORY - 1),
    ]);
    setFilters(saved.filters);
    setOperator(saved.operator);
  }, [savedFilters, filters, operator]);

  const deleteSavedFilter = useCallback((id: string) => {
    setSavedFilters((prev) => prev.filter((f) => f.id !== id));
  }, []);

  const loadHistoryEntry = useCallback((entry: FilterHistoryEntry) => {
    setFilters(entry.filters);
    setOperator(entry.operator);
  }, []);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.searchQuery) count++;
    if (filters.statusFilter !== 'all') count++;
    if (filters.minAmount !== '') count++;
    if (filters.maxAmount !== '') count++;
    if (filters.cycleLength !== '') count++;
    if (filters.hideFullGroups) count++;
    if (filters.myGroupsOnly) count++;
    return count;
  }, [filters]);

  const filteredGroups = useMemo(() => {
    if (isDefaultFilters(filters)) return [...groups];

    const checks: Array<(g: Group) => boolean> = [];

    if (filters.searchQuery) {
      const q = filters.searchQuery.toLowerCase();
      checks.push((g) => g.name.toLowerCase().includes(q) || (g.description?.toLowerCase().includes(q) ?? false));
    }
    if (filters.statusFilter !== 'all') {
      checks.push((g) => g.status === filters.statusFilter);
    }
    if (filters.minAmount !== '') {
      checks.push((g) => g.contributionAmount >= (filters.minAmount as number));
    }
    if (filters.maxAmount !== '') {
      checks.push((g) => g.contributionAmount <= (filters.maxAmount as number));
    }
    if (filters.cycleLength !== '') {
      checks.push((g) => g.cycleLength === (filters.cycleLength as number));
    }
    if (filters.hideFullGroups) {
      checks.push((g) => g.currentMembers < g.maxMembers);
    }
    if (filters.myGroupsOnly) {
      checks.push((g) => (g as any).isMember || (g as any).creator === userId);
    }

    let result = groups.filter((g) =>
      operator === 'AND' ? checks.every((fn) => fn(g)) : checks.some((fn) => fn(g))
    );

    result.sort((a, b) => {
      switch (filters.sortOption) {
        case 'oldest':
          return new Date(a.nextPayoutDate).getTime() - new Date(b.nextPayoutDate).getTime();
        case 'most_members':
          return b.currentMembers - a.currentMembers;
        case 'highest_contribution':
          return b.contributionAmount - a.contributionAmount;
        default:
          return new Date(b.nextPayoutDate).getTime() - new Date(a.nextPayoutDate).getTime();
      }
    });

    return result;
  }, [groups, filters, operator, userId]);

  return {
    filters,
    operator,
    setOperator,
    updateFilter,
    clearFilters,
    activeFilterCount,
    filteredGroups,
    savedFilters,
    saveCurrentFilter,
    loadSavedFilter,
    deleteSavedFilter,
    history,
    loadHistoryEntry,
  };
}
