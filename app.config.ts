import type { ConfigContext, ExpoConfig } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  ios: {
    ...config.ios,
    googleServicesFile: process.env.GOOGLE_SERVICE_INFO_PLIST ?? config.ios?.googleServicesFile,
    entitlements: {
      ...config.ios?.entitlements,
      // "production" because the development profile builds for internal
      // distribution, which signs with an Ad Hoc profile — and those use the
      // production APNs environment. A mismatch here means the entitlement is
      // stripped at signing and the device silently never receives pushes.
      'aps-environment': 'production',
    },
    infoPlist: {
      ...config.ios?.infoPlist,
      ITSAppUsesNonExemptEncryption: false,
      // Lets FCM deliver the digest while the app is backgrounded.
      UIBackgroundModes: ['remote-notification'],
    },
  },
  android: {
    ...config.android,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
