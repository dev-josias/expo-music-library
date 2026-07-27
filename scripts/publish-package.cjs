const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const root = path.resolve(__dirname, "..");
const pkg = require(path.join(root, "package.json"));
const artifactArgument = process.argv[2];
const expectedFilename = `${pkg.name}-${pkg.version}.tgz`;
const npmRegistry = "https://registry.npmjs.org/";
const registryReconciliationAttempts = 6;
const registryRetryDelayMilliseconds =
  process.env.EXPO_MUSIC_LIBRARY_REGISTRY_RETRY_DELAY_MS === "0"
    ? 0
    : 2_000;
const registryRetrySignal = new Int32Array(new SharedArrayBuffer(4));

if (!artifactArgument) {
  throw new Error(`An npm artifact is required (expected ${expectedFilename}).`);
}

const artifactPath = path.resolve(root, artifactArgument);
if (
  path.basename(artifactPath) !== expectedFilename ||
  !fs.existsSync(artifactPath)
) {
  throw new Error(`The release artifact must be named ${expectedFilename}.`);
}

const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const publicationRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "expo-music-library-publication-")
);
process.on("exit", () => {
  fs.rmSync(publicationRoot, { recursive: true, force: true });
});
const verifiedArtifactPath = path.join(publicationRoot, expectedFilename);
try {
  fs.copyFileSync(artifactPath, verifiedArtifactPath);
} catch {
  throw new Error("The release artifact could not be copied for publication.");
}

const npmCache =
  process.env.NPM_CONFIG_CACHE ??
  path.join(publicationRoot, "npm-cache");
const npmEnvironment = {
  ...process.env,
  NPM_CONFIG_CACHE: npmCache,
};

const verificationResult = spawnSync(
  process.execPath,
  [path.join(root, "scripts", "verify-package.cjs"), verifiedArtifactPath],
  {
    cwd: root,
    encoding: "utf8",
    env: npmEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  }
);
if (verificationResult.status !== 0) {
  throw new Error("The release artifact failed exact package verification.");
}

const candidateIntegrity = `sha512-${crypto
  .createHash("sha512")
  .update(fs.readFileSync(verifiedArtifactPath))
  .digest("base64")}`;

function runNpm(arguments_) {
  return spawnSync(npmCommand, arguments_, {
    cwd: root,
    encoding: "utf8",
    env: npmEnvironment,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function registryState() {
  const result = runNpm([
    "view",
    `${pkg.name}@${pkg.version}`,
    "dist.integrity",
    "--json",
    "--registry",
    npmRegistry,
  ]);

  if (result.status === 0) {
    let integrity;
    try {
      integrity = JSON.parse(result.stdout);
    } catch {
      throw new Error("npm returned malformed registry metadata.");
    }
    if (typeof integrity !== "string" || !integrity.startsWith("sha512-")) {
      throw new Error("The registry version has no valid integrity metadata.");
    }
    return { status: "published", integrity };
  }

  const diagnostic = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
  if (/\bE404\b/.test(diagnostic)) {
    return { status: "missing" };
  }
  throw new Error("The npm registry could not be queried safely.");
}

function waitForRegistryRetry() {
  if (registryRetryDelayMilliseconds > 0) {
    Atomics.wait(
      registryRetrySignal,
      0,
      0,
      registryRetryDelayMilliseconds
    );
  }
}

function reconcileRegistryAfterPublish() {
  let lastState = { status: "unavailable" };

  for (
    let attempt = 1;
    attempt <= registryReconciliationAttempts;
    attempt += 1
  ) {
    try {
      lastState = registryState();
    } catch {
      lastState = { status: "unavailable" };
    }

    if (lastState.status === "published") {
      return lastState;
    }

    if (attempt < registryReconciliationAttempts) {
      waitForRegistryRetry();
    }
  }

  return lastState;
}

function acceptExistingVersion(state) {
  if (state.status === "missing") {
    return false;
  }
  if (state.integrity !== candidateIntegrity) {
    throw new Error(
      `npm already contains ${pkg.name}@${pkg.version} with different bytes.`
    );
  }
  console.log(
    `${pkg.name}@${pkg.version} is already published with the verified integrity.`
  );
  return true;
}

if (acceptExistingVersion(registryState())) {
  process.exit(0);
}

const publishResult = runNpm([
  "publish",
  verifiedArtifactPath,
  "--ignore-scripts",
  "--access",
  "public",
  "--provenance",
  "--registry",
  npmRegistry,
]);

if (publishResult.status !== 0) {
  const stateAfterFailure = reconcileRegistryAfterPublish();
  if (stateAfterFailure.status === "unavailable") {
    throw new Error(
      "npm publish failed and the registry result could not be reconciled."
    );
  }
  if (acceptExistingVersion(stateAfterFailure)) {
    process.exit(0);
  }
  throw new Error("npm publish failed and the version is not in the registry.");
}

const publishedState = reconcileRegistryAfterPublish();
if (publishedState.status !== "published") {
  throw new Error(
    "npm accepted the publish command but the registry result could not be reconciled."
  );
}
if (publishedState.integrity !== candidateIntegrity) {
  throw new Error(
    "npm accepted the publish command but the registered integrity does not match."
  );
}

console.log(
  `Published ${pkg.name}@${pkg.version} from the verified npm artifact.`
);
