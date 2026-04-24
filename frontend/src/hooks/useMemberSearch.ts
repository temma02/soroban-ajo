import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useDebounce } from './useDebounce';
import { Member } from '@/types';

export interface MemberSearchFilters {
  status?: Member['status'] | 'all';
  minContributions?: number;
}

export interface MemberSearchResult {
  member: Member;
  /** Indices of matched chars in the display string for highlight */
  matchRanges: Array<[number, number]>;
  score: number;
}

const HISTORY_KEY = 'ajo_member_search_history';
const MAX_HISTORY = 8;
const CACHE_TTL = 30_000; // 30s

interface CacheEntry {
  results: MemberSearchResult[];
  ts: number;
}

/** Simple fuzzy match: returns score (higher = better) and match ranges */
function fuzzyMatch(text: string, query: string): { score: number; ranges: Array<[number, number]> } | null {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (!q) return { score: 0, ranges: [] };

  // Exact substring — highest score
  const idx = t.indexOf(q);
  if (idx !== -1) return { score: 100 - idx, ranges: [[idx, idx + q.length]] };

  // Character-by-character fuzzy
  let ti = 0, qi = 0;
  const ranges: Array<[number, number]> = [];
  let start = -1;
  while (ti < t.length && qi < q.length) {
    if (t[ti] === q[qi]) {
      if (start === -1) start = ti;
      qi++;
      if (qi === q.length || t[ti + 1] !== q[qi]) {
        ranges.push([start, ti + 1]);
        start = -1;
      }
    } else if (start !== -1) {
      ranges.push([start, ti]);
      start = -1;
    }
    ti++;
  }
  if (qi < q.length) return null; // no match
  return { score: Math.round((q.length / text.length) * 50), ranges };
}

function searchMembers(members: Member[], query: string, filters: MemberSearchFilters): MemberSearchResult[] {
  const results: MemberSearchResult[] = [];

  for (const member of members) {
    if (filters.status && filters.status !== 'all' && member.status !== filters.status) continue;
    if (filters.minContributions !== undefined && member.contributions < filters.minContributions) continue;

    const addressMatch = fuzzyMatch(member.address, query);
    const groupMatch = fuzzyMatch(member.groupId, query);
    const best = [addressMatch, groupMatch].reduce<typeof addressMatch>((a, b) => {
      if (!a) return b;
      if (!b) return a;
      return a.score >= b.score ? a : b;
    }, null);

    if (best) {
      results.push({ member, matchRanges: best.ranges, score: best.score });
    }
  }

  return results.sort((a, b) => b.score - a.score);
}

export function useMemberSearch(members: Member[]) {
  const [query, setQuery] = useState('');
  const [filters, setFilters] = useState<MemberSearchFilters>({ status: 'all' });
  const [activeIndex, setActiveIndex] = useState(-1);
  const [isOpen, setIsOpen] = useState(false);
  const [history, setHistory] = useState<string[]>(() => {
    try {
      const s = typeof window !== 'undefined' ? localStorage.getItem(HISTORY_KEY) : null;
      return s ? JSON.parse(s) : [];
    } catch { return []; }
  });

  const cache = useRef<Map<string, CacheEntry>>(new Map());
  const debouncedQuery = useDebounce(query, 250);

  const cacheKey = `${debouncedQuery}|${JSON.stringify(filters)}`;

  const results = useMemo<MemberSearchResult[]>(() => {
    if (!debouncedQuery.trim()) return [];

    const cached = cache.current.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.results;

    const r = searchMembers(members, debouncedQuery.trim(), filters);
    cache.current.set(cacheKey, { results: r, ts: Date.now() });
    return r;
  }, [members, debouncedQuery, filters, cacheKey]);

  // Reset active index when results change
  useEffect(() => { setActiveIndex(-1); }, [results]);

  const persistHistory = useCallback((term: string) => {
    setHistory((prev) => {
      const next = [term, ...prev.filter((h) => h !== term)].slice(0, MAX_HISTORY);
      if (typeof window !== 'undefined') localStorage.setItem(HISTORY_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const selectResult = useCallback((result: MemberSearchResult) => {
    persistHistory(query.trim());
    setIsOpen(false);
    return result.member;
  }, [query, persistHistory]);

  const applyHistoryEntry = useCallback((term: string) => {
    setQuery(term);
    setIsOpen(true);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    if (typeof window !== 'undefined') localStorage.removeItem(HISTORY_KEY);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!isOpen) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, -1));
    } else if (e.key === 'Escape') {
      setIsOpen(false);
      setActiveIndex(-1);
    }
  }, [isOpen, results.length]);

  const updateFilter = useCallback(<K extends keyof MemberSearchFilters>(k: K, v: MemberSearchFilters[K]) => {
    setFilters((p) => ({ ...p, [k]: v }));
  }, []);

  return {
    query,
    setQuery: (q: string) => { setQuery(q); setIsOpen(true); },
    filters,
    updateFilter,
    results,
    activeIndex,
    setActiveIndex,
    isOpen,
    setIsOpen,
    history,
    applyHistoryEntry,
    clearHistory,
    selectResult,
    handleKeyDown,
  };
}
