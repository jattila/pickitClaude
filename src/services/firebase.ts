import { getApp } from '@react-native-firebase/app';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';

export const firebaseApp = getApp();
export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
