import {
  ConfigPlugin,
  createRunOncePlugin,
  withAndroidManifest,
  withInfoPlist,
} from "@expo/config-plugins";
import pkg from "../../package.json";

export type MusicLibraryPluginProps = {
  /**
   * Custom description for the iOS music library usage permission.
   * Shown to the user when the system permission dialog appears.
   * @default "Allow $(PRODUCT_NAME) to access your music library."
   */
  musicLibraryPermission?: string;
};

type AndroidManifestLike = {
  "uses-permission"?: Array<{
    $?: Record<string, string>;
  }>;
};

/**
 * Adds only the permissions needed to read audio. This helper is exported so
 * the manifest transformation can be unit tested without running prebuild.
 */
export function ensureAndroidAudioPermissions(
  manifest: AndroidManifestLike
): AndroidManifestLike {
  const permissions = (manifest["uses-permission"] ??= []);

  const upsertPermission = (
    name: string,
    extras: Record<string, string> = {}
  ) => {
    const existing = permissions.find(
      (permission) => permission.$?.["android:name"] === name
    );
    if (existing) {
      existing.$ = {
        ...existing.$,
        "android:name": name,
        ...extras,
      };
      return;
    }
    permissions.push({
      $: {
        "android:name": name,
        ...extras,
      },
    });
  };

  // Android 13+ (API 33+).
  upsertPermission("android.permission.READ_MEDIA_AUDIO");

  // Android 12 and below. The max SDK prevents this obsolete permission from
  // participating in Android 13+ permission requests.
  upsertPermission("android.permission.READ_EXTERNAL_STORAGE", {
    "android:maxSdkVersion": "32",
  });

  return manifest;
}

export const withMusicLibraryIOS: ConfigPlugin<MusicLibraryPluginProps> = (
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

export const withMusicLibraryAndroid: ConfigPlugin = (config) => {
  return withAndroidManifest(config, (config) => {
    ensureAndroidAudioPermissions(config.modResults.manifest);
    return config;
  });
};

export const withMusicLibrary: ConfigPlugin<MusicLibraryPluginProps> = (
  config,
  props = {}
) => {
  config = withMusicLibraryIOS(config, props);
  config = withMusicLibraryAndroid(config);
  return config;
};

export default createRunOncePlugin(withMusicLibrary, pkg.name, pkg.version);
