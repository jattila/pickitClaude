const {
  withAppDelegate,
  withDangerousMod,
  withPlugins,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULAR_INCLUDES = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';

/**
 * The same allowance, but for the *app* target rather than the pods.
 *
 * @react-native-firebase/app-check's plugin puts `#import <RNFBAppCheckModule.h>`
 * into the Swift bridging header, and that header imports
 * <React/RCTBridgeModule.h>. The bridging header is compiled by the app target,
 * which the Podfile's post_install below never touches — so the build failed
 * there with "declaration of 'RCTBridgeModule' must be imported from module
 * 'RNFBApp.RNFBAppModule' before it is required", followed by a cascade of C
 * parse errors from the same header.
 */
function withAppTargetModularIncludes(config) {
  return withXcodeProject(config, (config) => {
    config.modResults.addBuildProperty(MODULAR_INCLUDES, 'YES');
    return config;
  });
}

/**
 * Loads the RNFBApp module before the bridging header includes
 * RNFBAppCheckModule.h.
 *
 * Under static frameworks, RNFBApp's module map textually includes React's
 * headers, so Clang considers RCTBridgeModule's declaration to be *owned* by
 * module RNFBApp.RNFBAppModule. Including RNFBAppCheckModule.h — which imports
 * <React/RCTBridgeModule.h> — without that module loaded fails with
 * "declaration of 'RCTBridgeModule' must be imported from module
 * 'RNFBApp.RNFBAppModule' before it is required".
 *
 * This is a different failure from the non-modular-include warning the two
 * mods above deal with, and the allowance flag does not silence it: the
 * declaration has to actually be visible, which means importing the module.
 *
 * Hangs off the AppDelegate mod purely for its timing: that is the mod
 * @react-native-firebase/app-check writes the bridging header from, and mods of
 * the same kind run in registration order, so being listed last in app.json puts
 * this after it. A dangerous mod would be the natural home, but those run at the
 * very start of the iOS chain — before the header exists at all, which is why
 * the first attempt silently did nothing. The AppDelegate contents are passed
 * through untouched.
 */
function withBridgingHeaderModuleImport(config) {
  return withAppDelegate(config, (config) => {
    {
      const iosRoot = config.modRequest.platformProjectRoot;
      const moduleImport = '@import RNFBApp;';

      for (const entry of fs.readdirSync(iosRoot, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const headerPath = path.join(iosRoot, entry.name, `${entry.name}-Bridging-Header.h`);
        if (!fs.existsSync(headerPath)) continue;

        const contents = fs.readFileSync(headerPath, 'utf8');
        if (contents.includes(moduleImport)) break;
        if (!contents.includes('RNFBAppCheckModule.h')) break;

        fs.writeFileSync(
          headerPath,
          contents.replace('#import <RNFBAppCheckModule.h>', `${moduleImport}\n#import <RNFBAppCheckModule.h>`)
        );
        break;
      }
    }

    return config;
  });
}

/**
 * react-native-firebase's Swift pods (FirebaseAuth, FirebaseFirestore, ...) only
 * build correctly with `use_frameworks! :linkage => :static` (set via
 * expo-build-properties) if the Podfile also sets this flag *before* the
 * Firebase pods are evaluated — see https://rnfirebase.io/ "Static Frameworks".
 * expo-build-properties has no option for this, so we inject it via a raw
 * Podfile edit during prebuild.
 */
function withFirebaseStaticFramework(config) {
  return withDangerousMod(config, [
    'ios',
    (config) => {
      const podfilePath = path.join(config.modRequest.platformProjectRoot, 'Podfile');
      let contents = fs.readFileSync(podfilePath, 'utf8');

      const topMarker = '$RNFirebaseAsStaticFramework = true';
      if (!contents.includes(topMarker)) {
        contents = `${topMarker}\n${contents}`;
      }

      // RNFBApp/RNFBAuth's framework modules include React-Core headers
      // (RCTBridgeModule.h, RCTConvert.h, ...) which aren't themselves built as
      // a Clang module under use_frameworks:static, tripping
      // -Wnon-modular-include-in-framework-module as an error. Known issue,
      // no upstream fix yet: https://github.com/expo/expo/issues/39607
      const buildSettingMarker = MODULAR_INCLUDES;
      if (!contents.includes(buildSettingMarker)) {
        contents = contents.replace(
          /post_install do \|installer\|\n/,
          `post_install do |installer|\n    installer.pods_project.targets.each do |target|\n      target.build_configurations.each do |build_config|\n        build_config.build_settings['${buildSettingMarker}'] = 'YES'\n      end\n    end\n`
        );
      }

      fs.writeFileSync(podfilePath, contents);
      return config;
    },
  ]);
}

module.exports = (config) =>
  withPlugins(config, [
    withFirebaseStaticFramework,
    withAppTargetModularIncludes,
    withBridgingHeaderModuleImport,
  ]);
