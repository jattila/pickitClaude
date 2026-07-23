const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

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
      const marker = '$RNFirebaseAsStaticFramework = true';
      if (!contents.includes(marker)) {
        contents = `${marker}\n${contents}`;
        fs.writeFileSync(podfilePath, contents);
      }
      return config;
    },
  ]);
}

module.exports = withFirebaseStaticFramework;
