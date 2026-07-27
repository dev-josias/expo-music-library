const assert = require("node:assert/strict");
const crypto = require("node:crypto");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, spawnSync } = require("node:child_process");
const zlib = require("node:zlib");

const root = path.resolve(__dirname, "..");
const pkg = require(path.join(root, "package.json"));
const supportedSdks = require("./fixtures/sdk-versions.json");
const expectedFilename = `${pkg.name}-${pkg.version}.tgz`;
const tarCommand = process.platform === "win32" ? "tar.exe" : "tar";
const npmCommand = process.platform === "win32" ? "npm.cmd" : "npm";
const realNpm = execFileSync(
  process.platform === "win32" ? "where.exe" : "which",
  [npmCommand],
  { encoding: "utf8" }
)
  .split(/\r?\n/)
  .find(Boolean);
const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "expo-music-library-tooling-test-")
);

function combinedOutput(result) {
  return `${result.stdout ?? ""}\n${result.stderr ?? ""}`;
}

function runNode(script, arguments_ = [], environment = process.env) {
  return spawnSync(process.execPath, [script, ...arguments_], {
    cwd: root,
    encoding: "utf8",
    env: environment,
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function expectSuccess(result, description) {
  assert.equal(
    result.status,
    0,
    `${description} failed:\n${combinedOutput(result)}`
  );
}

function expectFailure(result, pattern, description) {
  assert.notEqual(result.status, 0, `${description} unexpectedly succeeded.`);
  assert.match(combinedOutput(result), pattern, description);
}

function createBaselineArtifact() {
  const destination = path.join(temporaryRoot, "baseline");
  fs.mkdirSync(destination, { recursive: true });
  const output = execFileSync(
    realNpm,
    [
      "pack",
      "--ignore-scripts",
      "--json",
      "--pack-destination",
      destination,
      ".",
    ],
    {
      cwd: root,
      encoding: "utf8",
      env: {
        ...process.env,
        NPM_CONFIG_CACHE: path.join(destination, "npm-cache"),
      },
      stdio: ["ignore", "pipe", "pipe"],
    }
  );
  const metadata = JSON.parse(output);
  assert.equal(metadata.length, 1);
  assert.equal(metadata[0].filename, expectedFilename);
  return path.join(destination, expectedFilename);
}

function archiveFileNames(artifactPath) {
  return execFileSync(tarCommand, ["-tzf", artifactPath], {
    encoding: "utf8",
  })
    .split(/\r?\n/)
    .filter((entry) => entry && !entry.endsWith("/"));
}

function createModifiedArtifact(
  baselineArtifact,
  fixtureName,
  mutate,
  additionalEntries = []
) {
  const fixtureRoot = path.join(temporaryRoot, fixtureName);
  const extractionRoot = path.join(fixtureRoot, "contents");
  fs.mkdirSync(extractionRoot, { recursive: true });
  execFileSync(
    tarCommand,
    ["-xzf", baselineArtifact, "-C", extractionRoot],
    { stdio: "ignore" }
  );
  mutate(path.join(extractionRoot, "package"), extractionRoot);

  const artifactPath = path.join(fixtureRoot, expectedFilename);
  execFileSync(
    tarCommand,
    [
      "-czf",
      artifactPath,
      "-C",
      extractionRoot,
      ...archiveFileNames(baselineArtifact),
      ...additionalEntries,
    ],
    { stdio: "ignore" }
  );
  return artifactPath;
}

function rewriteFirstTarEntryName(
  baselineArtifact,
  fixtureName,
  replacementName
) {
  assert(Buffer.byteLength(replacementName) <= 100);
  const tar = zlib.gunzipSync(fs.readFileSync(baselineArtifact));
  const rewritten = Buffer.from(tar);
  rewritten.fill(0, 0, 100);
  rewritten.write(replacementName, 0, "utf8");
  rewritten.fill(0x20, 148, 156);

  let checksum = 0;
  for (let index = 0; index < 512; index += 1) {
    checksum += rewritten[index];
  }
  rewritten.write(checksum.toString(8).padStart(6, "0"), 148, 6, "ascii");
  rewritten[154] = 0;
  rewritten[155] = 0x20;

  const fixtureRoot = path.join(temporaryRoot, fixtureName);
  fs.mkdirSync(fixtureRoot, { recursive: true });
  const artifactPath = path.join(fixtureRoot, expectedFilename);
  fs.writeFileSync(artifactPath, zlib.gzipSync(rewritten));
  return artifactPath;
}

function installMockNpm() {
  const binRoot = path.join(temporaryRoot, "mock-bin");
  fs.mkdirSync(binRoot, { recursive: true });
  const mockScript = path.join(binRoot, "npm-mock.cjs");
  fs.writeFileSync(
    mockScript,
    `const fs = require("node:fs");
const { spawnSync } = require("node:child_process");

const [verb, ...arguments_] = process.argv.slice(2);
fs.appendFileSync(
  process.env.MOCK_NPM_LOG,
  JSON.stringify({ verb, arguments: arguments_ }) + "\\n"
);

if (verb === "pack") {
  const result = spawnSync(
    process.env.MOCK_REAL_NPM,
    [verb, ...arguments_],
    { env: process.env, stdio: "inherit" }
  );
  process.exit(result.status ?? 1);
}

const registryIndex = arguments_.indexOf("--registry");
if (
  registryIndex === -1 ||
  arguments_[registryIndex + 1] !== "https://registry.npmjs.org/"
) {
  process.stderr.write("registry was not pinned\\n");
  process.exit(90);
}

const scenario = process.env.MOCK_NPM_SCENARIO;
const stateExists = fs.existsSync(process.env.MOCK_NPM_STATE);
if (verb === "view") {
  if (scenario === "existing-same" || stateExists) {
    process.stdout.write(JSON.stringify(process.env.MOCK_NPM_INTEGRITY));
    process.exit(0);
  }
  if (scenario === "existing-different") {
    process.stdout.write(JSON.stringify("sha512-different"));
    process.exit(0);
  }
  if (scenario === "query-error") {
    process.stderr.write("npm ERR! code ECONNRESET\\n");
    process.exit(1);
  }
  process.stderr.write("npm ERR! code E404\\n");
  process.exit(1);
}

if (verb === "publish" && scenario === "missing-publish") {
  fs.writeFileSync(process.env.MOCK_NPM_STATE, "published");
  process.exit(0);
}

process.stderr.write("unexpected mock npm invocation\\n");
process.exit(91);
`
  );

  if (process.platform === "win32") {
    fs.writeFileSync(
      path.join(binRoot, "npm.cmd"),
      '@node "%~dp0\\npm-mock.cjs" %*\r\n'
    );
  } else {
    const executable = path.join(binRoot, "npm");
    fs.writeFileSync(
      executable,
      `#!/usr/bin/env node\nrequire(${JSON.stringify(mockScript)});\n`
    );
    fs.chmodSync(executable, 0o755);
  }
  return binRoot;
}

function readMockLog(logPath) {
  if (!fs.existsSync(logPath)) {
    return [];
  }
  return fs
    .readFileSync(logPath, "utf8")
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

function runPublisher(
  artifactPath,
  scenario,
  integrity,
  mockBin,
  runName
) {
  const runRoot = path.join(temporaryRoot, "publisher", runName);
  fs.mkdirSync(runRoot, { recursive: true });
  const logPath = path.join(runRoot, "npm.log");
  const statePath = path.join(runRoot, "state");
  const environment = {
    ...process.env,
    PATH: `${mockBin}${path.delimiter}${process.env.PATH}`,
    NPM_CONFIG_CACHE: path.join(runRoot, "npm-cache"),
    MOCK_NPM_INTEGRITY: integrity,
    MOCK_NPM_LOG: logPath,
    MOCK_NPM_SCENARIO: scenario,
    MOCK_NPM_STATE: statePath,
    MOCK_REAL_NPM: realNpm,
  };
  const result = runNode(
    path.join(root, "scripts", "publish-package.cjs"),
    [artifactPath],
    environment
  );
  return { calls: readMockLog(logPath), result };
}

function runTest(name, callback) {
  callback();
  console.log(`PASS ${name}`);
}

try {
  const verifier = path.join(root, "scripts", "verify-package.cjs");
  const releaseVerifier = path.join(root, "scripts", "verify-release.cjs");
  const baselineArtifact = createBaselineArtifact();
  const baselineIntegrity = `sha512-${crypto
    .createHash("sha512")
    .update(fs.readFileSync(baselineArtifact))
    .digest("base64")}`;

  runTest("frozen Expo fixture locks match the exact package bytes", () => {
    for (const [sdk, versions] of Object.entries(supportedSdks)) {
      const lock = JSON.parse(
        fs.readFileSync(
          path.join(
            root,
            "scripts",
            "fixtures",
            `expo-${sdk}.package-lock.json`
          ),
          "utf8"
        )
      );
      const dependencies = lock.packages[""].dependencies;
      const packedDependency =
        lock.packages["node_modules/expo-music-library"];
      const expectedArtifact = `file:../npm-artifact/${expectedFilename}`;

      assert.equal(dependencies.expo, versions.expo);
      assert.equal(dependencies["expo-status-bar"], versions.expoStatusBar);
      assert.equal(dependencies.react, versions.react);
      assert.equal(dependencies["react-native"], versions.reactNative);
      assert.equal(dependencies["expo-music-library"], expectedArtifact);
      assert.equal(packedDependency.version, pkg.version);
      assert.equal(packedDependency.resolved, expectedArtifact);
      assert.equal(packedDependency.integrity, baselineIntegrity);
    }
  });

  runTest("package verifier accepts the exact fresh artifact", () => {
    expectSuccess(
      runNode(verifier, [baselineArtifact]),
      "exact artifact verification"
    );
  });

  const lifecycleArtifact = createModifiedArtifact(
    baselineArtifact,
    "install-lifecycle",
    (packageRoot) => {
      const manifestPath = path.join(packageRoot, "package.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifest.scripts.postinstall = "node payload.cjs";
      fs.writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    }
  );
  runTest("package verifier rejects install lifecycle scripts", () => {
    expectFailure(
      runNode(verifier, [lifecycleArtifact]),
      /must not define the npm postinstall lifecycle script/,
      "install lifecycle rejection"
    );
  });

  const manifestArtifact = createModifiedArtifact(
    baselineArtifact,
    "manifest-mismatch",
    (packageRoot) => {
      const manifestPath = path.join(packageRoot, "package.json");
      const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
      manifest.peerDependencies.expo = ">=999";
      fs.writeFileSync(
        manifestPath,
        `${JSON.stringify(manifest, null, 2)}\n`
      );
    }
  );
  runTest("package verifier compares the complete manifest", () => {
    expectFailure(
      runNode(verifier, [manifestArtifact]),
      /package\.json inside the tarball does not match the source package/,
      "complete manifest comparison"
    );
  });

  const extraFileArtifact = createModifiedArtifact(
    baselineArtifact,
    "extra-file",
    (packageRoot) => {
      fs.writeFileSync(path.join(packageRoot, "EXTRA.txt"), "unexpected\n");
    },
    ["package/EXTRA.txt"]
  );
  runTest("package verifier compares supplied contents to a fresh pack", () => {
    expectFailure(
      runNode(verifier, [extraFileArtifact]),
      /does not match a fresh pack of the source tree/,
      "fresh package comparison"
    );
  });

  const modeArtifact = createModifiedArtifact(
    baselineArtifact,
    "mode-mismatch",
    (packageRoot) => {
      fs.chmodSync(path.join(packageRoot, "README.md"), 0o755);
    }
  );
  runTest("package verifier compares archive file modes", () => {
    expectFailure(
      runNode(verifier, [modeArtifact]),
      /does not match a fresh pack of the source tree/,
      "archive mode comparison"
    );
  });

  const secret = `sntry${"s_"}${"A".repeat(32)}`;
  const secretArtifact = createModifiedArtifact(
    baselineArtifact,
    "secret-content",
    (packageRoot) => {
      fs.appendFileSync(
        path.join(packageRoot, "README.md"),
        Buffer.from(`\n\u0000${secret}\n`)
      );
    }
  );
  runTest("package verifier reports secrets without printing values", () => {
    const result = runNode(verifier, [secretArtifact]);
    expectFailure(
      result,
      /possible Sentry access token/,
      "secret-content rejection"
    );
    assert.doesNotMatch(combinedOutput(result), new RegExp(secret));
  });

  const symlinkArtifact = createModifiedArtifact(
    baselineArtifact,
    "symlink-entry",
    (packageRoot) => {
      fs.symlinkSync("README.md", path.join(packageRoot, "README-link.md"));
    },
    ["package/README-link.md"]
  );
  runTest("package verifier rejects non-regular archive entries", () => {
    expectFailure(
      runNode(verifier, [symlinkArtifact]),
      /Only regular files and directories are allowed/,
      "symlink archive rejection"
    );
  });

  const traversalArtifact = rewriteFirstTarEntryName(
    baselineArtifact,
    "traversal-entry",
    "package/../outside"
  );
  runTest("package verifier rejects archive traversal", () => {
    expectFailure(
      runNode(verifier, [traversalArtifact]),
      /could not be inspected|unsafe path|outside its package root/,
      "archive traversal rejection"
    );
  });

  runTest("release verifier accepts only the package tag", () => {
    expectSuccess(
      runNode(releaseVerifier, [`v${pkg.version}`]),
      "matching release tag"
    );
    expectFailure(
      runNode(releaseVerifier, [`v${pkg.version}.1`]),
      /release tag does not match package version/,
      "mismatched release tag"
    );
  });

  const mockBin = installMockNpm();
  const integrity = `sha512-${crypto
    .createHash("sha512")
    .update(fs.readFileSync(baselineArtifact))
    .digest("base64")}`;

  runTest("publisher accepts an identical registry version", () => {
    const { result, calls } = runPublisher(
      baselineArtifact,
      "existing-same",
      integrity,
      mockBin,
      "existing-same"
    );
    expectSuccess(result, "existing identical version reconciliation");
    assert.equal(calls.filter((call) => call.verb === "publish").length, 0);
    assert.equal(calls.filter((call) => call.verb === "view").length, 1);
  });

  runTest("publisher rejects an existing version with different bytes", () => {
    const { result, calls } = runPublisher(
      baselineArtifact,
      "existing-different",
      integrity,
      mockBin,
      "existing-different"
    );
    expectFailure(
      result,
      /already contains .* with different bytes/,
      "different registry integrity rejection"
    );
    assert.equal(calls.filter((call) => call.verb === "publish").length, 0);
  });

  runTest("publisher publishes a missing version through the pinned registry", () => {
    const { result, calls } = runPublisher(
      baselineArtifact,
      "missing-publish",
      integrity,
      mockBin,
      "missing-publish"
    );
    expectSuccess(result, "missing version publish");
    assert.equal(calls.filter((call) => call.verb === "publish").length, 1);
    assert.equal(calls.filter((call) => call.verb === "view").length, 2);
  });

  runTest("publisher does not treat registry failures as missing versions", () => {
    const { result, calls } = runPublisher(
      baselineArtifact,
      "query-error",
      integrity,
      mockBin,
      "query-error"
    );
    expectFailure(
      result,
      /registry could not be queried safely/,
      "registry query failure"
    );
    assert.equal(calls.filter((call) => call.verb === "publish").length, 0);
  });

  runTest("publisher verifies a supplied artifact before registry calls", () => {
    const { result, calls } = runPublisher(
      lifecycleArtifact,
      "existing-same",
      integrity,
      mockBin,
      "verify-before-registry"
    );
    expectFailure(
      result,
      /failed exact package verification/,
      "publisher artifact verification"
    );
    assert.equal(calls.filter((call) => call.verb === "view").length, 0);
    assert.equal(calls.filter((call) => call.verb === "publish").length, 0);
  });
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
