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
