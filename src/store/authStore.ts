import { create } from 'zustand';
import { onAuthStateChanged, type User } from '@react-native-firebase/auth';
import { auth } from '../services/firebase';

interface AuthState {
  user: User | null;
  initializing: boolean;
}

export const useAuthStore = create<AuthState>(() => ({
  user: null,
  initializing: true,
}));

onAuthStateChanged(auth, (user) => {
  useAuthStore.setState({ user, initializing: false });
});
