'use client';

import React, { useRef, useEffect } from 'react';
import { useHelp } from '@/contexts/HelpContext';
import { useContextualHelp } from '@/hooks/useContextualHelp';
import { faqs } from '@/data/faqs';

interface HelpSearchProps {
  onClose?: () => void;
}

export function HelpSearch({ onClose }: HelpSearchProps) {
  const { openHelp } = useHelp();
  const { query, setQuery, results, clearSearch } = useContextualHelp();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Show recent FAQs when no query
  const defaultItems = faqs.slice(0, 6);

  const handleFaqClick = (id: string) => {
    const faq = faqs.find((f) => f.id === id);
    if (!faq) return;
    openHelp({ id: faq.id, title: faq.question, content: faq.answer });
    onClose?.();
  };

  return (
    <div className="flex flex-col h-full">
      {/* Search input */}
      <div className="relative px-4 py-3 border-b border-gray-200 dark:border-slate-700">
        <span className="absolute inset-y-0 left-7 flex items-center pointer-events-none text-gray-400" aria-hidden>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 115 11a6 6 0 0112 0z" />
          </svg>
        </span>
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search help…"
          aria-label="Search help content"
          className="w-full pl-8 pr-8 py-2 rounded-lg border border-gray-300 dark:border-slate-600 dark:bg-slate-700 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        {query && (
          <button
            onClick={clearSearch}
            className="absolute inset-y-0 right-7 flex items-center text-gray-400 hover:text-gray-600"
            aria-label="Clear search"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {/* Results / default list */}
      <div className="flex-1 overflow-y-auto">
        {query ? (
          results.length > 0 ? (
            <ul role="list" className="divide-y divide-gray-100 dark:divide-slate-700">
              {results.map((r) => (
                <li key={r.id}>
                  <button
                    type="button"
                    onClick={() => {
                      if (r.faq) handleFaqClick(r.faq.id);
                      else if (r.topic) { openHelp(r.topic); onClose?.(); }
                    }}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
                  >
                    <div className="flex items-start gap-2">
                      <span className="mt-0.5 flex-shrink-0 text-gray-400">
                        {r.type === 'faq'
                          ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                          : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        }
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{r.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-2">{r.excerpt}</p>
                        {r.category && (
                          <span className="inline-block mt-1 text-xs text-blue-600 dark:text-blue-400">{r.category}</span>
                        )}
                      </div>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="px-4 py-8 text-sm text-gray-500 text-center">No results for "{query}"</p>
          )
        ) : (
          <div>
            <p className="px-4 pt-3 pb-1 text-xs font-semibold text-gray-400 uppercase">Popular topics</p>
            <ul role="list" className="divide-y divide-gray-100 dark:divide-slate-700">
              {defaultItems.map((faq) => (
                <li key={faq.id}>
                  <button
                    type="button"
                    onClick={() => handleFaqClick(faq.id)}
                    className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {faq.question}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
