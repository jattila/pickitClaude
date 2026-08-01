import { getApp } from '@react-native-firebase/app';
import { initializeAppCheck, ReactNativeFirebaseAppCheckProvider } from '@react-native-firebase/app-check';
import { getAuth } from '@react-native-firebase/auth';
import { getFirestore } from '@react-native-firebase/firestore';
import { getFunctions } from '@react-native-firebase/functions';

export const firebaseApp = getApp();

/**
 * App Check attests that requests come from a genuine, unmodified build of this
 * app on a real device. The Firebase config ships inside the binary and can be
 * extracted from it, so without this anyone can talk to the project directly
 * over the REST API — sign up, then burn Firestore operations (and the Cloud
 * Function invocation every write triggers) on our bill.
 *
 * Debug provider under __DEV__ because neither Play Integrity nor App Attest
 * can attest a development build; the native log prints a debug token that has
 * to be registered in the Firebase console once per device.
 *
 * Started here rather than from a screen so it runs before authStore's listener
 * attaches. Deliberately not awaited: the SDK holds requests until a token is
 * available, and a failure here must not stop the app from starting —
 * enforcement is a server-side decision, not this call's.
 */
const appCheckProvider = new ReactNativeFirebaseAppCheckProvider();
appCheckProvider.configure({
  android: { provider: __DEV__ ? 'debug' : 'playIntegrity' },
  // appAttest needs iOS 14+; the fallback keeps older devices on deviceCheck
  // instead of failing attestation outright.
  apple: { provider: __DEV__ ? 'debug' : 'appAttestWithDeviceCheckFallback' },
  isTokenAutoRefreshEnabled: true,
});

export const appCheckReady = initializeAppCheck(firebaseApp, {
  provider: appCheckProvider,
  isTokenAutoRefreshEnabled: true,
}).catch((error) => {
  // Worth having in the logs: once enforcement is on in the console, a failure
  // here is the difference between a working app and every request rejected.
  console.warn('App Check initialization failed', error);
});

export const auth = getAuth(firebaseApp);
export const firestore = getFirestore(firebaseApp);
export const functions = getFunctions(firebaseApp);
