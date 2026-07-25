export interface ShoppingList {
  id: string;
  name: string;
  groupId: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ShoppingItem {
  id: string; // slug(normalizedName), unique per list
  listId: string;
  name: string;
  normalizedName: string;
  quantity: string | null;
  checked: boolean;
  checkedBy: string | null; // uid of whoever checked it; always null locally (guests have no other members)
  checkedByName: string | null;
  checkedAt: number | null;
  createdAt: number;
  updatedAt: number;
}

export interface CatalogEntry {
  id: string; // slug(normalizedName)
  name: string;
  normalizedName: string;
  usageCount: number;
  lastUsedAt: number;
  createdAt: number;
}

/** Result of attempting to add an item that already exists and is checked — used to drive the "restore?" confirm dialog. */
export interface AddItemResult {
  item: ShoppingItem;
  wasAlreadyChecked: boolean;
}

export interface Group {
  id: string;
  name: string;
  ownerId: string;
  memberIds: string[];
  createdAt: number;
  updatedAt: number;
}

export interface GroupMember {
  uid: string;
  displayName: string;
  /**
   * Denormalized from users/{uid}. Members can't read each other's user docs
   * (those hold settings and digest state), so the email has to live here to
   * be visible in the member list. Null for members who joined before this
   * field existed.
   */
  email: string | null;
  role: 'owner' | 'member';
  joinedAt: number;
}
