import { LocalListsRepository } from './local/LocalListsRepository';
import { FirestoreListsRepository } from './cloud/FirestoreListsRepository';
import { useAuthStore } from '../store/authStore';
import type { ListsRepository } from './ListsRepository';

/** Returns the active repository: Firestore once registered, local SQLite while a guest. */
export function useRepository(): ListsRepository {
  const user = useAuthStore((state) => state.user);
  return user ? FirestoreListsRepository : LocalListsRepository;
}
