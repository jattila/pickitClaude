import { useEffect, useMemo, useRef, useState } from 'react';
import { useRepository } from '../data/useRepository';
import { normalizeName } from '../services/normalize';
import type { CatalogEntry } from '../data/types';

const MAX_SUGGESTIONS = 10;

/**
 * Autocomplete over a scope's catalog, matching anywhere in the name rather
 * than only at the start.
 *
 * Firestore can't do that — it supports prefix ranges and nothing more — so the
 * catalog is loaded whole and filtered here. A household's catalog is small
 * enough that this costs less than a query per keystroke, and matching becomes
 * instant instead of a round trip.
 *
 * The load happens once per typing session (when the field goes from empty to
 * non-empty), so products added moments ago are still picked up without
 * querying on every character.
 */
export function useCatalogSuggestions(prefix: string, groupId?: string | null) {
  const repo = useRepository();
  const [entries, setEntries] = useState<CatalogEntry[]>([]);
  const loadedScope = useRef<string | null>(null);

  const typing = prefix.trim().length > 0;
  const scopeKey = groupId ?? 'personal';

  useEffect(() => {
    if (!typing) {
      // Cleared: forget the scope so the next session reloads a fresh catalog.
      loadedScope.current = null;
      return;
    }
    if (loadedScope.current === scopeKey) return;
    loadedScope.current = scopeKey;

    let cancelled = false;
    repo
      .getCatalogEntries(groupId ?? null)
      .then((all) => {
        if (!cancelled) setEntries(all);
      })
      .catch(() => {
        if (!cancelled) setEntries([]);
      });

    return () => {
      cancelled = true;
    };
  }, [repo, typing, scopeKey, groupId]);

  // Normalized the same way stored names are, so accents typed or omitted both
  // match: "tejfol" and "tejföl" reach the same entry.
  const needle = normalizeName(prefix);

  return useMemo(() => {
    if (!needle) return [];
    return entries
      .filter((entry) => entry.normalizedName.includes(needle))
      .sort((a, b) => {
        // Names starting with what was typed are the likelier intent, so they
        // lead; among equals, whatever has been bought more often.
        const aStarts = a.normalizedName.startsWith(needle) ? 0 : 1;
        const bStarts = b.normalizedName.startsWith(needle) ? 0 : 1;
        if (aStarts !== bStarts) return aStarts - bStarts;
        return b.usageCount - a.usageCount;
      })
      .slice(0, MAX_SUGGESTIONS);
  }, [entries, needle]);
}
