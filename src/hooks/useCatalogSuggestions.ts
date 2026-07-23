import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import type { CatalogEntry } from '../data/types';

const DEBOUNCE_MS = 200;

export function useCatalogSuggestions(listId: string, prefix: string) {
  const repo = useRepository();
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    if (!prefix.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      repo.getCatalogSuggestions(listId, prefix).then((results) => {
        if (!cancelled) setSuggestions(results);
      });
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [repo, listId, prefix]);

  return suggestions;
}
