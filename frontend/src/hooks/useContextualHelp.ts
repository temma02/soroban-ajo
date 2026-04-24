import { useState, useMemo, useCallback } from 'react';
import { faqs, FAQ } from '@/data/faqs';
import { HelpTopic } from '@/contexts/HelpContext';

export interface HelpSearchResult {
  type: 'faq' | 'topic';
  id: string;
  title: string;
  excerpt: string;
  category?: string;
  /** Original item */
  faq?: FAQ;
  topic?: HelpTopic;
}

/** Additional help topics registered by components at runtime */
const registeredTopics: Map<string, HelpTopic> = new Map();

export function registerHelpTopic(topic: HelpTopic) {
  registeredTopics.set(topic.id, topic);
}

function score(text: string, query: string): number {
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  if (t.includes(q)) return 2;
  if (q.split(' ').some((w) => t.includes(w))) return 1;
  return 0;
}

export function useContextualHelp() {
  const [query, setQuery] = useState('');

  const results = useMemo<HelpSearchResult[]>(() => {
    const q = query.trim();
    if (!q) return [];

    const out: Array<HelpSearchResult & { _score: number }> = [];

    for (const faq of faqs) {
      const s =
        score(faq.question, q) * 3 +
        score(faq.answer, q) * 2 +
        faq.tags.reduce((acc, t) => acc + score(t, q), 0);
      if (s > 0) {
        out.push({
          _score: s,
          type: 'faq',
          id: faq.id,
          title: faq.question,
          excerpt: faq.answer.slice(0, 120) + (faq.answer.length > 120 ? '…' : ''),
          category: faq.category,
          faq,
        });
      }
    }

    for (const topic of registeredTopics.values()) {
      const s = score(topic.title, q) * 3 + score(topic.content, q) * 2;
      if (s > 0) {
        out.push({
          _score: s,
          type: 'topic',
          id: topic.id,
          title: topic.title,
          excerpt: topic.content.slice(0, 120) + (topic.content.length > 120 ? '…' : ''),
          topic,
        });
      }
    }

    return out.sort((a, b) => b._score - a._score).slice(0, 10);
  }, [query]);

  const clearSearch = useCallback(() => setQuery(''), []);

  return { query, setQuery, results, clearSearch };
}
