import { useCallback, useMemo } from 'react';
import { getOrCreateGroupDefaultList, isGroupDefaultList } from '../services/groups';
import { useUiStore } from '../store/uiStore';
import type { Group, ShoppingList } from '../data/types';

export const PERSONAL_SCOPE = 'personal';

export interface HomeScope {
  /** 'personal', or the group id. */
  key: string;
  label: string;
  groupId: string | null;
  /** The list whose items show inline. Null until the first item creates it. */
  listId: string | null;
  /** Creates that list on demand, so opening the app never writes anything. */
  ensureListId: () => Promise<string>;
}

/**
 * The shopping lists the home screen can show inline.
 *
 * Everyone has one to start with — their own. Sharing it, or joining a group
 * that shares one, adds another, and at that point the screen needs to say which
 * one you are looking at. With a single scope the selector stays hidden and the
 * screen looks exactly as it always did; that is the common case and it should
 * not pay for the rarer one.
 */
export function useHomeScopes(
  groups: Group[],
  sharedLists: ShoppingList[],
  personalListId: string | null,
  ensurePersonalListId: () => Promise<string>
) {
  const homeScopeKey = useUiStore((state) => state.homeScopeKey);
  const setHomeScopeKey = useUiStore((state) => state.setHomeScopeKey);

  const scopes = useMemo<HomeScope[]>(() => {
    const personal: HomeScope = {
      key: PERSONAL_SCOPE,
      label: 'Saját',
      groupId: null,
      listId: personalListId,
      ensureListId: ensurePersonalListId,
    };

    const groupScopes = groups
      .map((group) => {
        // Two ways a group can have a whole-shopping-list. Either someone shared
        // theirs into it (mainListId), or it predates sharing and has the
        // deterministic loose-items list. The second is read off the lists we
        // already subscribe to rather than fetched, so recognising it is free.
        const legacyDefault = sharedLists.find((list) => isGroupDefaultList(group.id, list.id));
        const listId = group.mainListId ?? legacyDefault?.id ?? null;
        return {
          key: group.id,
          label: group.name,
          groupId: group.id,
          listId,
          ensureListId: () =>
            getOrCreateGroupDefaultList(group.id, group.mainListId).then((list) => list.id),
        } satisfies HomeScope;
      })
      // A group formed to share one particular list has no whole-list of its
      // own; that list belongs among the rows, not behind a scope tab.
      .filter((scope) => scope.listId !== null);

    return [personal, ...groupScopes];
  }, [groups, sharedLists, personalListId, ensurePersonalListId]);

  // A scope disappears when you leave the group or its list is unshared, and the
  // selection has to survive that without stranding the screen on nothing.
  const selected = scopes.find((scope) => scope.key === homeScopeKey) ?? scopes[0];

  const listIdsInScopes = useMemo(
    () => new Set(scopes.map((scope) => scope.listId).filter((id): id is string => !!id)),
    [scopes]
  );

  const select = useCallback((key: string) => setHomeScopeKey(key), [setHomeScopeKey]);

  return { scopes, selected, select, listIdsInScopes };
}
