'use client';

import React, { useState, useRef, useEffect, useId } from 'react';
import { HelpTopic } from '@/contexts/HelpContext';

type PopoverPlacement = 'top' | 'bottom' | 'left' | 'right';

interface HelpPopoverProps {
  topic: HelpTopic;
  placement?: PopoverPlacement;
  /** Render a custom trigger; defaults to the ? button */
  trigger?: React.ReactNode;
  className?: string;
}

const PLACEMENT: Record<PopoverPlacement, string> = {
  top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
  bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
  left: 'right-full top-1/2 -translate-y-1/2 mr-2',
  right: 'left-full top-1/2 -translate-y-1/2 ml-2',
};

const ARROW: Record<PopoverPlacement, string> = {
  top: 'top-full left-1/2 -translate-x-1/2 border-t-gray-800 dark:border-t-slate-700 border-l-transparent border-r-transparent border-b-transparent',
  bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-gray-800 dark:border-b-slate-700 border-l-transparent border-r-transparent border-t-transparent',
  left: 'left-full top-1/2 -translate-y-1/2 border-l-gray-800 dark:border-l-slate-700 border-t-transparent border-b-transparent border-r-transparent',
  right: 'right-full top-1/2 -translate-y-1/2 border-r-gray-800 dark:border-r-slate-700 border-t-transparent border-b-transparent border-l-transparent',
};

export function HelpPopover({ topic, placement = 'top', trigger, className = '' }: HelpPopoverProps) {
  const [open, setOpen] = useState(false);
  const popoverId = useId();
  const containerRef = useRef<HTMLSpanElement>(null);

  // Close on outside click or Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    const onClick = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, [open]);

  return (
    <span ref={containerRef} className={`relative inline-flex items-center ${className}`}>
      {trigger ? (
        <span
          role="button"
          tabIndex={0}
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`Help: ${topic.title}`}
          onClick={() => setOpen((o) => !o)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && setOpen((o) => !o)}
          className="cursor-pointer"
        >
          {trigger}
        </span>
      ) : (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={popoverId}
          aria-label={`Help: ${topic.title}`}
          onClick={() => setOpen((o) => !o)}
          className={[
            'inline-flex items-center justify-center w-5 h-5 text-xs font-semibold rounded-full',
            'border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
            open
              ? 'bg-blue-600 text-white border-blue-600'
              : 'text-blue-600 border-blue-400 hover:bg-blue-50 dark:text-blue-400 dark:border-blue-500 dark:hover:bg-blue-900/20',
          ].join(' ')}
        >
          ?
        </button>
      )}

      {open && (
        <span
          id={popoverId}
          role="dialog"
          aria-label={topic.title}
          className={`absolute z-50 ${PLACEMENT[placement]} w-72`}
        >
          <span className="block bg-gray-800 dark:bg-slate-700 text-white rounded-xl shadow-xl overflow-hidden">
            {/* Header */}
            <span className="flex items-center justify-between px-4 py-2.5 border-b border-white/10">
              <span className="text-sm font-semibold">{topic.title}</span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-white/60 hover:text-white transition-colors ml-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
            {/* Body */}
            <span className="block px-4 py-3 text-sm text-white/90 leading-relaxed">
              {topic.content}
            </span>
            {/* Footer */}
            {topic.learnMoreUrl && (
              <span className="block px-4 py-2.5 border-t border-white/10">
                <a
                  href={topic.learnMoreUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-300 hover:text-blue-200 hover:underline"
                >
                  Learn more →
                </a>
              </span>
            )}
          </span>
          {/* Arrow */}
          <span className={`absolute w-0 h-0 border-8 ${ARROW[placement]}`} aria-hidden />
        </span>
      )}
    </span>
  );
}
