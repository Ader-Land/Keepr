/**
 * Limits the legacy storage permissions that expo-media-library always adds so
 * they only apply to Android versions that still need them:
 *  - READ_EXTERNAL_STORAGE  -> Android 12L (API 32) and below
 *  - WRITE_EXTERNAL_STORAGE -> Android 10 (API 29) and below
 * Newer versions use READ_MEDIA_IMAGES / READ_MEDIA_VIDEO and the system
 * delete-confirmation dialog, so the broad permissions are not requested there.
 */
const { withAndroidManifest } = require('expo/config-plugins');

const LIMITS = {
    'android.permission.READ_EXTERNAL_STORAGE': '32',
    'android.permission.WRITE_EXTERNAL_STORAGE': '29',
};

module.exports = function withScopedStoragePermissions(config) {
    return withAndroidManifest(config, (cfg) => {
        const manifest = cfg.modResults.manifest;
        manifest.$ = manifest.$ || {};
        manifest.$['xmlns:tools'] = 'http://schemas.android.com/tools';

        const existing = manifest['uses-permission'] || [];
        const kept = existing.filter((p) => !(p.$['android:name'] in LIMITS));
        const limited = Object.entries(LIMITS).map(([name, max]) => ({
            $: {
                'android:name': name,
                'android:maxSdkVersion': max,
                'tools:replace': 'android:maxSdkVersion',
            },
        }));
        manifest['uses-permission'] = [...kept, ...limited];
        return cfg;
    });
};
