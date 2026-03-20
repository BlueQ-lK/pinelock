const { withAndroidManifest } = require("@expo/config-plugins");

/**
 * @param {import("@expo/config-plugins").ExportedConfig} config
 */
const withAndroidUsageStats = (config) => {
  return withAndroidManifest(config, (config) => {
    const mainApplication = config.modResults.manifest.application[0];

    // Ensure we have the uses-permission array
    if (!config.modResults.manifest["uses-permission"]) {
      config.modResults.manifest["uses-permission"] = [];
    }

    const hasPermission = config.modResults.manifest["uses-permission"].some(
      (p) => p.$["android:name"] === "android.permission.PACKAGE_USAGE_STATS"
    );

    if (!hasPermission) {
      config.modResults.manifest["uses-permission"].push({
        $: {
          "android:name": "android.permission.PACKAGE_USAGE_STATS",
          "tools:ignore": "ProtectedPermissions",
        },
      });
    }

    return config;
  });
};

module.exports = withAndroidUsageStats;
