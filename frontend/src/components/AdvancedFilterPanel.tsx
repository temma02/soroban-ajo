'use client';

import React, { useState } from 'react';
import { FilterState, FilterStatus, SortOption } from '@/hooks/useGroupFilters';
import { FilterOperator, SavedFilter, FilterHistoryEntry } from '@/hooks/useAdvancedFilters';

interface AdvancedFilterPanelProps {
  filters: FilterState;
  operator: FilterOperator;
  activeFilterCount: number;
  savedFilters: SavedFilter[];
  history: FilterHistoryEntry[];
  onUpdateFilter: <K extends keyof FilterState>(key: K, value: FilterState[K]) => void;
  onSetOperator: (op: FilterOperator) => void;
  onClear: () => void;
  onSave: (name: string) => void;
  onLoadSaved: (id: string) => void;
  onDeleteSaved: (id: string) => void;
  onLoadHistory: (entry: FilterHistoryEntry) => void;
}

const QUICK_FILTERS: Array<{ label: string; apply: Partial<FilterState> }> = [
  { label: 'Active', apply: { statusFilter: 'active' } },
  { label: 'Has Spots', apply: { hideFullGroups: true } },
  { label: 'My Groups', apply: { myGroupsOnly: true } },
  { label: 'High Value', apply: { minAmount: 100 } },
  { label: 'Short Cycle', apply: { maxAmount: '', cycleLength: 30 } },
];

export const AdvancedFilterPanel: React.FC<AdvancedFilterPanelProps> = ({
  filters,
  operator,
  activeFilterCount,
  savedFilters,
  history,
  onUpdateFilter,
  onSetOperator,
  onClear,
  onSave,
  onLoadSaved,
  onDeleteSaved,
  onLoadHistory,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<'filters' | 'saved' | 'history'>('filters');
  const [saveNameInput, setSaveNameInput] = useState('');
  const [showSaveInput, setShowSaveInput] = useState(false);

  const handleSave = () => {
    if (!saveNameInput.trim()) return;
    onSave(saveNameInput.trim());
    setSaveNameInput('');
    setShowSaveInput(false);
  };

  return (
    <div className="w-full bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm my-4">
      {/* Header */}
      <div
        className="px-4 py-3 flex justify-between items-center cursor-pointer hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors rounded-t-xl"
        onClick={() => setIsOpen((o) => !o)}
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span className="font-semibold text-gray-700 dark:text-gray-200">Advanced Filters</span>
          {activeFilterCount > 0 && (
            <span className="ml-1 px-2 py-0.5 text-xs font-bold bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {activeFilterCount > 0 && (
            <button
              onClick={(e) => { e.stopPropagation(); onClear(); }}
              className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400"
            >
              Clear All
            </button>
          )}
          <svg
            className={`w-5 h-5 text-gray-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </div>

      {/* Quick filter chips */}
      <div className="px-4 pb-2 flex flex-wrap gap-2">
        {QUICK_FILTERS.map((qf) => {
          const isActive = Object.entries(qf.apply).every(
            ([k, v]) => (filters as any)[k] === v
          );
          return (
            <button
              key={qf.label}
              onClick={() => {
                if (isActive) {
                  // toggle off: reset those keys to default
                  Object.keys(qf.apply).forEach((k) => {
                    const key = k as keyof FilterState;
                    onUpdateFilter(key, (({ statusFilter: 'all', hideFullGroups: false, myGroupsOnly: false, minAmount: '', maxAmount: '', cycleLength: '' } as any)[key]));
                  });
                } else {
                  Object.entries(qf.apply).forEach(([k, v]) => onUpdateFilter(k as keyof FilterState, v as any));
                }
              }}
              className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-slate-600 hover:border-blue-400'
              }`}
            >
              {qf.label}
            </button>
          );
        })}
      </div>

      {isOpen && (
        <div className="border-t border-gray-200 dark:border-slate-700">
          {/* Tabs */}
          <div className="flex border-b border-gray-200 dark:border-slate-700">
            {(['filters', 'saved', 'history'] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
                  tab === t
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700 dark:text-gray-400'
                }`}
              >
                {t}
                {t === 'saved' && savedFilters.length > 0 && (
                  <span className="ml-1 text-xs text-gray-400">({savedFilters.length})</span>
                )}
              </button>
            ))}
          </div>

          {/* Filters tab */}
          {tab === 'filters' && (
            <div className="p-4 space-y-4">
              {/* AND/OR operator */}
              <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-gray-500 uppercase">Combine filters with:</span>
                <div className="flex rounded-md overflow-hidden border border-gray-300 dark:border-slate-600">
                  {(['AND', 'OR'] as FilterOperator[]).map((op) => (
                    <button
                      key={op}
                      onClick={() => onSetOperator(op)}
                      className={`px-3 py-1 text-xs font-bold transition-colors ${
                        operator === op
                          ? 'bg-blue-600 text-white'
                          : 'bg-white dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {op}
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Status</label>
                  <select
                    value={filters.statusFilter}
                    onChange={(e) => onUpdateFilter('statusFilter', e.target.value as FilterStatus)}
                    className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="active">Active</option>
                    <option value="completed">Completed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>

                {/* Amount range */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Contribution ($)</label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      placeholder="Min"
                      value={filters.minAmount}
                      onChange={(e) => onUpdateFilter('minAmount', e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                    <span className="text-gray-400">–</span>
                    <input
                      type="number"
                      placeholder="Max"
                      value={filters.maxAmount}
                      onChange={(e) => onUpdateFilter('maxAmount', e.target.value ? Number(e.target.value) : '')}
                      className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    />
                  </div>
                </div>

                {/* Cycle length */}
                <div>
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Cycle (Days)</label>
                  <input
                    type="number"
                    placeholder="e.g. 30"
                    value={filters.cycleLength}
                    onChange={(e) => onUpdateFilter('cycleLength', e.target.value ? Number(e.target.value) : '')}
                    className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>

                {/* Sort + toggles */}
                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sort By</label>
                  <select
                    value={filters.sortOption}
                    onChange={(e) => onUpdateFilter('sortOption', e.target.value as SortOption)}
                    className="w-full rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  >
                    <option value="newest">Newest First</option>
                    <option value="oldest">Oldest First</option>
                    <option value="most_members">Most Members</option>
                    <option value="highest_contribution">Highest Contribution</option>
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.myGroupsOnly} onChange={(e) => onUpdateFilter('myGroupsOnly', e.target.checked)} className="rounded text-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">My Groups Only</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={filters.hideFullGroups} onChange={(e) => onUpdateFilter('hideFullGroups', e.target.checked)} className="rounded text-blue-600" />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Hide Full Groups</span>
                  </label>
                </div>
              </div>

              {/* Save current filter */}
              <div className="pt-2 border-t border-gray-100 dark:border-slate-700 flex items-center gap-2">
                {showSaveInput ? (
                  <>
                    <input
                      type="text"
                      value={saveNameInput}
                      onChange={(e) => setSaveNameInput(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleSave()}
                      placeholder="Filter preset name…"
                      className="flex-1 rounded-md border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm shadow-sm focus:border-blue-500 focus:ring-blue-500"
                      autoFocus
                    />
                    <button onClick={handleSave} className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700">Save</button>
                    <button onClick={() => setShowSaveInput(false)} className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
                  </>
                ) : (
                  <button
                    onClick={() => setShowSaveInput(true)}
                    disabled={activeFilterCount === 0}
                    className="text-sm text-blue-600 hover:text-blue-800 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                    </svg>
                    Save as preset
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Saved tab */}
          {tab === 'saved' && (
            <div className="p-4">
              {savedFilters.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No saved filter presets yet.</p>
              ) : (
                <ul className="space-y-2">
                  {savedFilters.map((sf) => (
                    <li key={sf.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
                      <div>
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{sf.name}</p>
                        <p className="text-xs text-gray-400">{new Date(sf.createdAt).toLocaleDateString()} · {sf.operator}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => onLoadSaved(sf.id)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Apply</button>
                        <button onClick={() => onDeleteSaved(sf.id)} className="text-xs text-red-500 hover:text-red-700">Delete</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div className="p-4">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No filter history yet.</p>
              ) : (
                <ul className="space-y-2">
                  {history.map((entry, i) => {
                    const active = Object.entries(entry.filters)
                      .filter(([k, v]) => (DEFAULT_FILTERS as any)[k] !== v)
                      .map(([k]) => k.replace(/([A-Z])/g, ' $1').toLowerCase())
                      .join(', ');
                    return (
                      <li key={i} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 dark:bg-slate-700 border border-gray-200 dark:border-slate-600">
                        <div>
                          <p className="text-xs text-gray-500">{new Date(entry.appliedAt).toLocaleString()}</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300 truncate max-w-xs">{active || 'Default filters'}</p>
                        </div>
                        <button onClick={() => onLoadHistory(entry)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Restore</button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
