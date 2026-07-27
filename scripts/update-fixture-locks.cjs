const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const exampleRoot = path.join(root, "example");
const artifactArgument = process.argv[2];
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const supportedSdks = require("./fixtures/sdk-versions.json");

if (!artifactArgument) {
  throw new Error("Pass the exact verified npm tarball to freeze.");
}

const artifactPath = path.resolve(root, artifactArgument);
const pkg = require(path.join(root, "package.json"));
const expectedFilename = `${pkg.name}-${pkg.version}.tgz`;

if (
  path.basename(artifactPath) !== expectedFilename ||
  !fs.existsSync(artifactPath)
) {
  throw new Error(`Expected the verified artifact ${expectedFilename}.`);
}

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "expo-music-library-fixtures-")
);
const temporaryExampleRoot = path.join(temporaryRoot, "example");
const temporaryArtifactRoot = path.join(temporaryRoot, "npm-artifact");
const temporaryFixturesRoot = path.join(temporaryRoot, "fixtures");
const temporaryArtifactPath = path.join(
  temporaryArtifactRoot,
  expectedFilename
);

function run(command, arguments_, options = {}) {
  const result = spawnSync(command, arguments_, {
    cwd: root,
    stdio: "inherit",
    ...options,
  });
  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed while updating locks.`);
  }
}

try {
  run(process.execPath, [
    path.join(__dirname, "verify-package.cjs"),
    artifactPath,
  ]);

  fs.mkdirSync(temporaryExampleRoot, { recursive: true });
  fs.mkdirSync(temporaryArtifactRoot, { recursive: true });
  fs.mkdirSync(temporaryFixturesRoot, { recursive: true });
  fs.copyFileSync(artifactPath, temporaryArtifactPath);
  fs.copyFileSync(
    path.join(exampleRoot, ".npmrc"),
    path.join(temporaryExampleRoot, ".npmrc")
  );

  for (const sdk of Object.keys(supportedSdks).sort()) {
    for (const filename of ["package.json", "tsconfig.json"]) {
      fs.copyFileSync(
        path.join(exampleRoot, filename),
        path.join(temporaryExampleRoot, filename)
      );
    }
    run(
      process.execPath,
      [
        path.join(__dirname, "configure-example-sdk.cjs"),
        sdk,
        temporaryArtifactPath,
      ],
      {
        env: {
          ...process.env,
          EXPO_MUSIC_LIBRARY_EXAMPLE_ROOT: temporaryExampleRoot,
          UPDATE_FIXTURE_LOCKS: "1",
        },
      }
    );
    run(
      npmCommand,
      ["install", "--package-lock-only", "--ignore-scripts"],
      {
        cwd: temporaryExampleRoot,
        env: {
          ...process.env,
          NPM_CONFIG_CACHE: path.join(temporaryRoot, "npm-cache"),
        },
      }
    );
    fs.copyFileSync(
      path.join(temporaryExampleRoot, "package-lock.json"),
      path.join(temporaryFixturesRoot, `expo-${sdk}.package-lock.json`)
    );
  }

  for (const sdk of Object.keys(supportedSdks).sort()) {
    fs.copyFileSync(
      path.join(temporaryFixturesRoot, `expo-${sdk}.package-lock.json`),
      path.join(__dirname, "fixtures", `expo-${sdk}.package-lock.json`)
    );
  }
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}

console.log(`Updated frozen Expo 55-57 locks for ${expectedFilename}.`);
