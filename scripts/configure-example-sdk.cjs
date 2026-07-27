const fs = require("node:fs");
const path = require("node:path");

const sdk = process.argv[2];
const artifactArgument = process.argv[3];
const updatingFixtureLock = process.env.UPDATE_FIXTURE_LOCKS === "1";
const supportedSdks = require("./fixtures/sdk-versions.json");

if (!Object.hasOwn(supportedSdks, sdk)) {
  throw new Error(
    `Unsupported Expo SDK fixture "${sdk ?? ""}". Expected 55, 56, or 57.`
  );
}

const fixture = supportedSdks[sdk];
const projectRoot = path.resolve(__dirname, "..");
const exampleRoot = process.env.EXPO_MUSIC_LIBRARY_EXAMPLE_ROOT
  ? path.resolve(process.env.EXPO_MUSIC_LIBRARY_EXAMPLE_ROOT)
  : path.join(projectRoot, "example");
const packagePath = path.join(exampleRoot, "package.json");
const lockPath = path.join(exampleRoot, "package-lock.json");
const tsconfigPath = path.join(exampleRoot, "tsconfig.json");
const pkg = JSON.parse(fs.readFileSync(packagePath, "utf8"));
let fixtureLockPath;

pkg.dependencies.expo = fixture.expo;
pkg.dependencies["expo-status-bar"] = fixture.expoStatusBar;
pkg.dependencies.react = fixture.react;
pkg.dependencies["react-native"] = fixture.reactNative;
pkg.devDependencies.typescript = fixture.typescript;

if (artifactArgument) {
  const sourcePackage = require(path.join(projectRoot, "package.json"));
  const artifactPath = path.resolve(exampleRoot, "..", artifactArgument);
  const expectedFilename = `${sourcePackage.name}-${sourcePackage.version}.tgz`;
  fixtureLockPath = path.join(
    __dirname,
    "fixtures",
    `expo-${sdk}.package-lock.json`
  );
  if (
    path.basename(artifactPath) !== expectedFilename ||
    !fs.existsSync(artifactPath)
  ) {
    throw new Error(`Expected the verified artifact ${expectedFilename}.`);
  }
  if (!updatingFixtureLock && !fs.existsSync(fixtureLockPath)) {
    throw new Error(`Missing the frozen Expo SDK ${sdk} fixture lock.`);
  }
  const relativeArtifactPath = path
    .relative(exampleRoot, artifactPath)
    .split(path.sep)
    .join("/");
  pkg.dependencies["expo-music-library"] = `file:${relativeArtifactPath}`;

  // The checked-in example resolves the package source for local development.
  // Artifact fixtures must instead compile against the declarations that will
  // actually be installed from npm.
  const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf8"));
  if (tsconfig.compilerOptions) {
    delete tsconfig.compilerOptions.paths;
  }
  fs.writeFileSync(tsconfigPath, `${JSON.stringify(tsconfig, null, 2)}\n`);
}

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
if (fixtureLockPath && !updatingFixtureLock) {
  fs.copyFileSync(fixtureLockPath, lockPath);
} else {
  fs.rmSync(lockPath, { force: true });
}

console.log(
  `Configured the native example for Expo SDK ${sdk} (${fixture.reactNative}).`
);
