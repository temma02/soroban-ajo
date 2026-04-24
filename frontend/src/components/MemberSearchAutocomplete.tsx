'use client';

import React, { useRef, useEffect, useId } from 'react';
import { Member } from '@/types';
import { MemberSearchResult, MemberSearchFilters, useMemberSearch } from '@/hooks/useMemberSearch';

interface MemberSearchAutocompleteProps {
  members: Member[];
  onSelect: (member: Member) => void;
  placeholder?: string;
  /** Keyboard shortcut to focus (e.g. '/') */
  focusKey?: string;
}

/** Renders text with highlighted match ranges */
function HighlightedText({ text, ranges }: { text: string; ranges: Array<[number, number]> }) {
  if (!ranges.length) return <span>{text}</span>;

  const parts: React.ReactNode[] = [];
  let cursor = 0;
  for (const [start, end] of ranges) {
    if (cursor < start) parts.push(<span key={cursor}>{text.slice(cursor, start)}</span>);
    parts.push(
      <mark key={start} className="bg-yellow-200 dark:bg-yellow-700 text-inherit rounded-sm px-0.5">
        {text.slice(start, end)}
      </mark>
    );
    cursor = end;
  }
  if (cursor < text.length) parts.push(<span key={cursor}>{text.slice(cursor)}</span>);
  return <>{parts}</>;
}

const STATUS_COLORS: Record<Member['status'], string> = {
  active: 'bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300',
  inactive: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400',
  completed: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
};

export function MemberSearchAutocomplete({
  members,
  onSelect,
  placeholder = 'Search members…',
  focusKey = '/',
}: MemberSearchAutocompleteProps) {
  const inputId = useId();
  const listId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const {
    query, setQuery,
    filters, updateFilter,
    results,
    activeIndex, setActiveIndex,
    isOpen, setIsOpen,
    history, applyHistoryEntry, clearHistory,
    selectResult,
    handleKeyDown,
  } = useMemberSearch(members);

  // Keyboard shortcut to focus input
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === focusKey && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [focusKey]);

  // Scroll active item into view
  useEffect(() => {
    if (activeIndex >= 0 && listRef.current) {
      const item = listRef.current.children[activeIndex] as HTMLElement;
      item?.scrollIntoView({ block: 'nearest' });
    }
  }, [activeIndex]);

  const handleSelect = (result: MemberSearchResult) => {
    onSelect(selectResult(result));
  };

  const handleEnter = (e: React.KeyboardEvent) => {
    handleKeyDown(e);
    if (e.key === 'Enter' && activeIndex >= 0 && results[activeIndex]) {
      handleSelect(results[activeIndex]);
    }
  };

  const showDropdown = isOpen && (results.length > 0 || (!query && history.length > 0));

  return (
    <div className="relative w-full" role="combobox" aria-expanded={showDropdown} aria-haspopup="listbox" aria-owns={listId}>
      {/* Search input + filters row */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <span className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-gray-400" aria-hidden>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
            </svg>
          </span>
          <input
            ref={inputRef}
            id={inputId}
            type="search"
            role="searchbox"
            aria-autocomplete="list"
            aria-controls={listId}
            aria-activedescendant={activeIndex >= 0 ? `member-option-${activeIndex}` : undefined}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleEnter}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 150)}
            placeholder={placeholder}
            className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute inset-y-0 right-2 flex items-center text-gray-400 hover:text-gray-600"
              aria-label="Clear search"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Status filter */}
        <select
          value={filters.status ?? 'all'}
          onChange={(e) => updateFilter('status', e.target.value as MemberSearchFilters['status'])}
          className="rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm py-2 px-2 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          aria-label="Filter by status"
        >
          <option value="all">All</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-800 rounded-lg border border-gray-200 dark:border-slate-700 shadow-lg overflow-hidden">
          {/* Recent searches (shown when query is empty) */}
          {!query && history.length > 0 && (
            <div>
              <div className="flex items-center justify-between px-3 py-1.5 border-b border-gray-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-gray-400 uppercase">Recent</span>
                <button onClick={clearHistory} className="text-xs text-gray-400 hover:text-gray-600">Clear</button>
              </div>
              <ul>
                {history.map((term) => (
                  <li key={term}>
                    <button
                      onMouseDown={() => applyHistoryEntry(term)}
                      className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 flex items-center gap-2"
                    >
                      <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {term}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Results */}
          {results.length > 0 && (
            <>
              <div className="px-3 py-1.5 border-b border-gray-100 dark:border-slate-700">
                <span className="text-xs font-semibold text-gray-400 uppercase">
                  {results.length} member{results.length !== 1 ? 's' : ''}
                </span>
              </div>
              <ul
                ref={listRef}
                id={listId}
                role="listbox"
                aria-label="Member search results"
                className="max-h-64 overflow-y-auto"
              >
                {results.map((result, i) => (
                  <li
                    key={result.member.address + result.member.groupId}
                    id={`member-option-${i}`}
                    role="option"
                    aria-selected={i === activeIndex}
                    onMouseDown={() => handleSelect(result)}
                    onMouseEnter={() => setActiveIndex(i)}
                    className={`px-3 py-2.5 cursor-pointer flex items-center justify-between gap-3 transition-colors ${
                      i === activeIndex
                        ? 'bg-blue-50 dark:bg-blue-900/30'
                        : 'hover:bg-gray-50 dark:hover:bg-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-mono text-gray-800 dark:text-gray-200 truncate">
                        <HighlightedText text={result.member.address} ranges={result.matchRanges} />
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        Group: <HighlightedText text={result.member.groupId} ranges={[]} />
                        {' · '}{result.member.contributions} contributions
                      </p>
                    </div>
                    <span className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[result.member.status]}`}>
                      {result.member.status}
                    </span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* No results */}
          {query && results.length === 0 && (
            <p className="px-3 py-4 text-sm text-gray-500 text-center">No members found for "{query}"</p>
          )}
        </div>
      )}
    </div>
  );
}
