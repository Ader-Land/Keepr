/* Patches the prebuilt android/app/build.gradle so the release build is signed
 * with the keystore described by environment variables.
 * Usage (CI only): node scripts/ci/apply-release-signing.js
 */
const fs = require('fs');
const path = require('path');

const file = path.join('android', 'app', 'build.gradle');
const gradle = fs.readFileSync(file, 'utf8');

if (gradle.includes('signingConfigs.release')) {
    console.log('Release signing already configured.');
    process.exit(0);
}

const releaseConfig = `        release {
            storeFile file(System.getenv("KEEPR_KEYSTORE_PATH"))
            storePassword System.getenv("KEEPR_KEYSTORE_PASSWORD")
            keyAlias System.getenv("KEEPR_KEY_ALIAS")
            keyPassword System.getenv("KEEPR_KEY_PASSWORD")
        }
`;

const withConfig = gradle.replace(/signingConfigs\s*\{\r?\n/, (match) => match + releaseConfig);
if (withConfig === gradle) throw new Error('Could not find signingConfigs block in build.gradle');

const patched = withConfig.replace(
    /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig signingConfigs\.debug/,
    '$1signingConfig signingConfigs.release'
);
if (patched === withConfig) throw new Error('Could not find release signingConfig in build.gradle');

fs.writeFileSync(file, patched);
console.log('Release signing configured.');
