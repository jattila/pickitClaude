import { useEffect, useState } from 'react';
import { useRepository } from '../data/useRepository';
import type { CatalogEntry } from '../data/types';

const DEBOUNCE_MS = 200;

export function useCatalogSuggestions(listId: string | null, prefix: string) {
  const repo = useRepository();
  const [suggestions, setSuggestions] = useState<CatalogEntry[]>([]);

  useEffect(() => {
    if (!prefix.trim()) {
      setSuggestions([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      // A null listId means the hidden default list doesn't exist yet — the
      // catalog behind it still does, so suggest from it rather than going
      // silent until the user's first item creates the list.
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
