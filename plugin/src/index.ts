import {
  ConfigPlugin,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} from "@expo/config-plugins";

type Props = {
  /**
   * Custom description for the iOS music library usage permission.
   * Shown to the user when the system permission dialog appears.
   * @default "Allow $(PRODUCT_NAME) to access your music library."
   */
  musicLibraryPermission?: string;
};

const withMusicLibraryIOS: ConfigPlugin<Props> = (
  config,
  { musicLibraryPermission } = {}
) => {
  return withInfoPlist(config, (config) => {
    config.modResults["NSAppleMusicUsageDescription"] =
      musicLibraryPermission ??
      config.modResults["NSAppleMusicUsageDescription"] ??
      "Allow $(PRODUCT_NAME) to access your music library.";
    return config;
  });
};

const withMusicLibraryAndroid: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults.manifest;

    if (!manifest["uses-permission"]) {
      manifest["uses-permission"] = [];
    }

    const permissions = manifest["uses-permission"];

    const addPermission = (name: string, extras?: Record<string, string>) => {
      const alreadyExists = permissions.some(
        (p) => p.$?.["android:name"] === name
      );
      if (!alreadyExists) {
        permissions.push({ $: { "android:name": name, ...extras } });
      }
    };

    // Android 13+ (API 33+)
    addPermission("android.permission.READ_MEDIA_AUDIO");

    // Android 12 and below
    addPermission("android.permission.READ_EXTERNAL_STORAGE");

    return config;
  });
};

const withMusicLibrary: ConfigPlugin<Props> = (config, props = {}) => {
  config = withMusicLibraryIOS(config, props);
  config = withMusicLibraryAndroid(config);
  return config;
};

// eslint-disable-next-line @typescript-eslint/no-var-requires
const pkg = require("../../package.json");

export default createRunOncePlugin(withMusicLibrary, pkg.name, pkg.version);
