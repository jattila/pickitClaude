import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import type { CatalogEntry } from '../data/types';

const DEBOUNCE_MS = 200;

export function useCatalogSuggestions(listId: string | null, prefix: string) {
  const repo = useRepository();
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    if (!listId || !prefix.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const targetListId = listId;
    const timer = setTimeout(() => {
      repo.getCatalogSuggestions(targetListId, prefix).then((results) => {
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
