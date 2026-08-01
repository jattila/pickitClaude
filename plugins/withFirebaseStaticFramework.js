const { withDangerousMod, withPlugins, withXcodeProject } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const MODULAR_INCLUDES = 'CLANG_ALLOW_NON_MODULAR_INCLUDES_IN_FRAMEWORK_MODULES';

/**
 * The same allowance, but for the *app* target rather than the pods.
 *
 * @react-native-firebase/app-check's plugin puts `#import <RNFBAppCheckModule.h>`
 * into the Swift bridging header, which the app target compiles — and the
 * Podfile's post_install below only reaches the pod targets. Kept as hygiene
 * for that include path.
 *
 * It is not what fixed the App Check build failure, despite being added while
 * chasing it: that turned out to be the pod's own header (see
 * patches/@react-native-firebase+app-check+25.1.0.patch).
 */
function withAppTargetModularIncludes(config) {
  return withXcodeProject(config, (config) => {
    config.modResults.addBuildProperty(MODULAR_INCLUDES, 'YES');
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
  withPlugins(config, [withFirebaseStaticFramework, withAppTargetModularIncludes]);
