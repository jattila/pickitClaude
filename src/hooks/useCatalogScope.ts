import { useEffect } from 'react';
import { useNavigationState, useRoute } from '@react-navigation/native';
import { useUiStore } from '../store/uiStore';

/**
 * Declares which catalog this screen's suggestions come from, so "Katalógus"
 * opens that one rather than always the personal catalog.
 *
 * Whoever is on top of the home stack owns the scope, whether or not its tab is
 * the one showing. Focus alone is not enough: switching the active list in
 * Beállítások changes the home screen's list while another tab has focus, and
 * the next tap on Katalógus must already see that. Being on top is also what
 * stops the home screen, still mounted underneath an opened list, from
 * overwriting that list's scope.
 */
export function useCatalogScope(groupId: string | null | undefined) {
  const setCatalogGroupId = useUiStore((state) => state.setCatalogGroupId);
  const routeKey = useRoute().key;
  const isTop = useNavigationState((state) => state.routes[state.index]?.key === routeKey);

  useEffect(() => {
    if (isTop) setCatalogGroupId(groupId ?? null);
  }, [isTop, groupId, setCatalogGroupId]);
}
