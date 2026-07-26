import { ensureAndroidAudioPermissions } from "../../plugin/src";

describe("config plugin Android permissions", () => {
  it("adds only audio read permissions with a legacy max SDK", () => {
    const manifest = ensureAndroidAudioPermissions({});
    expect(manifest["uses-permission"]).toEqual([
      {
        $: {
          "android:name": "android.permission.READ_MEDIA_AUDIO",
        },
      },
      {
        $: {
          "android:name": "android.permission.READ_EXTERNAL_STORAGE",
          "android:maxSdkVersion": "32",
        },
      },
    ]);
  });

  it("is idempotent and repairs an existing legacy permission", () => {
    const manifest: {
      "uses-permission": Array<{ $: Record<string, string> }>;
    } = {
      "uses-permission": [
        {
          $: {
            "android:name": "android.permission.READ_EXTERNAL_STORAGE",
          },
        },
      ],
    };

    ensureAndroidAudioPermissions(manifest);
    ensureAndroidAudioPermissions(manifest);

    expect(
      manifest["uses-permission"].filter(
        (permission) =>
          permission.$["android:name"] ===
          "android.permission.READ_EXTERNAL_STORAGE"
      )
    ).toHaveLength(1);
    expect(manifest["uses-permission"][0].$["android:maxSdkVersion"]).toBe(
      "32"
    );
    expect(
      manifest["uses-permission"].some((permission) =>
        ["READ_MEDIA_IMAGES", "READ_MEDIA_VIDEO"].some((name) =>
          permission.$["android:name"].endsWith(name)
        )
      )
    ).toBe(false);
  });
});
