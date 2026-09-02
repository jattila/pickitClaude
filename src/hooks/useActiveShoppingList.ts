import { useMemo } from 'react';
import { useDefaultList } from './useQuickAdd';
import { useProfilePointers } from './useProfilePointers';
import { useAuthStore } from '../store/authStore';
import type { Group, ShoppingList } from '../data/types';

export interface ShoppingListChoice {
  listId: string;
  name: string;
  /** Null for the private one; the circle it is shared with otherwise. */
  groupId: string | null;
  memberCount: number;
}

export interface ActiveShoppingList {
  /** Null until the first loose item creates it (guests, and fresh accounts). */
  listId: string | null;
  /** What the header says. */
  name: string;
  groupId: string | null;
  ensureListId: () => Promise<string>;
}

/**
 * The one shopping list the home screen is writing into.
 *
 * There is deliberately no picker on that screen any more. Sharing your list, or
 * joining someone else's, sets this; switching between them lives in
 * Beállítások, because it is something you do when your circumstances change,
 * not while shopping. What matters here is that the name is visible — so nobody
 * writes the week's groceries onto the holiday list without noticing.
 */
export function useActiveShoppingList(
  groups: Group[],
  personalLists: ShoppingList[],
  sharedLists: ShoppingList[]
): ActiveShoppingList {
  const user = useAuthStore((state) => state.user);
  const { listId: localListId, ensureListId } = useDefaultList();
  const { defaultListId } = useProfilePointers();

  return useMemo(() => {
    // Guests have no profile; their list lives in SQLite and the repository
    // resolves it. Signed-in users get the live pointer, so a switch made in
    // Beállítások redraws this screen without anything having to tell it.
    const pointer = user ? defaultListId : localListId;

    // Members who joined a circle without ever having a list of their own have
    // nothing recorded yet. Falling back to the first circle that shares a list
    // beats showing them an empty personal one they never asked for.
    const fallback = groups.find((group) => group.mainListId)?.mainListId ?? null;
    const listId = pointer ?? fallback;

    const meta = [...personalLists, ...sharedLists].find((list) => list.id === listId) ?? null;

    return {
      listId,
      name: meta?.name ?? 'Bevásárlólista',
      groupId: meta?.groupId ?? null,
      ensureListId,
    };
  }, [user, defaultListId, localListId, groups, personalLists, sharedLists, ensureListId]);
}

/**
 * Every shopping list this account can switch between: its own, plus the shared
 * list of each circle it belongs to. Occasional lists are not here — those are
 * rows on the home screen, not somewhere you *are*.
 */
export function useShoppingListChoices(
  groups: Group[],
  personalLists: ShoppingList[],
  sharedLists: ShoppingList[]
): ShoppingListChoice[] {
  const { personalListId } = useProfilePointers();

  return useMemo(() => {
    const choices: ShoppingListChoice[] = [];

    // Absent once it has been shared: it then appears below as a circle's list
    // instead, which is the same document under the name its owner gave it.
    const personal = personalLists.find((list) => list.id === personalListId);
    if (personal) {
      choices.push({ listId: personal.id, name: personal.name, groupId: null, memberCount: 1 });
    }

    for (const group of groups) {
      if (!group.mainListId) continue;
      const list = sharedLists.find((item) => item.id === group.mainListId);
      choices.push({
        listId: group.mainListId,
        // The list's own name is the one its owner chose when sharing; the
        // group's is a copy, and only the list's can be renamed afterwards.
        name: list?.name ?? group.name,
        groupId: group.id,
        memberCount: group.memberIds.length,
      });
    }

    return choices;
  }, [groups, personalLists, sharedLists, personalListId]);
}
