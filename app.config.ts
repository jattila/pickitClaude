import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * Set by the `development` build profile in eas.json.
 *
 * Without it the development build and the one testers have share a package
 * name, and Android will not install both: they are signed with different keys,
 * so the second is rejected outright rather than placed alongside. Giving the
 * development variant its own identity is what makes "keep the tester build on
 * the phone while iterating on the dev one" possible.
 */
const IS_DEV = process.env.APP_VARIANT === 'development';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...(config as ExpoConfig),
  name: IS_DEV ? 'PickIt Dev' : (config.name as string),
  // A separate scheme as well: with both installed, a pickit:// invite link
  // would be ambiguous and the OS would silently pick one.
  scheme: IS_DEV ? 'pickit-dev' : config.scheme,
  ios: {
    ...config.ios,
    bundleIdentifier: IS_DEV ? 'com.pickitclaude.app.dev' : config.ios?.bundleIdentifier,
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
    package: IS_DEV ? 'com.pickitclaude.app.dev' : config.android?.package,
    googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? config.android?.googleServicesFile,
  },
});
