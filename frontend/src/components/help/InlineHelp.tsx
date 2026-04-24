'use client';

import React, { useState } from 'react';

interface InlineHelpProps {
  /** Short summary always visible */
  summary: string;
  /** Full detail shown on expand (optional) */
  detail?: string;
  /** Link to help center */
  learnMoreUrl?: string;
  className?: string;
}

export function InlineHelp({ summary, detail, learnMoreUrl, className = '' }: InlineHelpProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <aside
      role="note"
      className={`rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/40 px-3 py-2.5 text-sm ${className}`}
    >
      <div className="flex items-start gap-2">
        <svg className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20" aria-hidden>
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <div className="flex-1 min-w-0">
          <p className="text-blue-800 dark:text-blue-200">{summary}</p>

          {detail && expanded && (
            <p className="mt-1.5 text-blue-700 dark:text-blue-300 leading-relaxed">{detail}</p>
          )}

          <div className="flex items-center gap-3 mt-1.5">
            {detail && (
              <button
                type="button"
                onClick={() => setExpanded((e) => !e)}
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 rounded"
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
            {learnMoreUrl && (
              <a
                href={learnMoreUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
              >
                Learn more →
              </a>
            )}
          </div>
        </div>
      </div>
    </aside>
  );
}
