const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync } = require("node:child_process");
const { isDeepStrictEqual } = require("node:util");
const {
  resolveConfigPluginFunctionWithInfo,
} = require("@expo/config-plugins/build/utils/plugin-resolver");

const root = path.resolve(__dirname, "..");
const sourcePackage = require(path.join(root, "package.json"));
const suppliedArtifact = process.argv[2];
const expectedFilename = `${sourcePackage.name}-${sourcePackage.version}.tgz`;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function setsMatch(left, right) {
  return (
    left.size === right.size &&
    [...left].every((relativePath) => right.has(relativePath))
  );
}

function entryMapsMatch(left, right) {
  return (
    left.size === right.size &&
    [...left].every(
      ([relativePath, entry]) =>
        right.get(relativePath)?.type === entry.type &&
        right.get(relativePath)?.mode === entry.mode
    )
  );
}

function assertNoInstallLifecycleScripts(packageManifest, description) {
  const scripts = packageManifest.scripts;
  if (!scripts || typeof scripts !== "object") {
    return;
  }

  for (const lifecycle of ["preinstall", "install", "postinstall"]) {
    assert(
      !Object.prototype.hasOwnProperty.call(scripts, lifecycle),
      `${description} must not define the npm ${lifecycle} lifecycle script.`
    );
  }
}

function listFiles(directory, relativeDirectory = "") {
  return fs
    .readdirSync(path.join(directory, relativeDirectory), {
      withFileTypes: true,
    })
    .flatMap((entry) => {
      assert(
        !entry.isSymbolicLink(),
        "Symbolic links are not allowed in the npm artifact."
      );
      const relativePath = path.posix.join(relativeDirectory, entry.name);
      if (entry.isDirectory()) {
        return listFiles(directory, relativePath);
      }
      assert(
        entry.isFile(),
        "Only regular files and directories are allowed in the npm artifact."
      );
      return [relativePath];
    });
}

function inspectArchive(artifactPath) {
  let nameOutput;
  let verboseOutput;
  try {
    nameOutput = execFileSync(
      process.platform === "win32" ? "tar.exe" : "tar",
      ["-tzf", artifactPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
    verboseOutput = execFileSync(
      process.platform === "win32" ? "tar.exe" : "tar",
      ["-tvzf", artifactPath],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }
    );
  } catch {
    throw new Error("The npm artifact could not be inspected.");
  }

  const archiveNames = nameOutput.split(/\r?\n/).filter(Boolean);
  const verboseEntries = verboseOutput.split(/\r?\n/).filter(Boolean);
  assert(
    archiveNames.length > 0 &&
      archiveNames.length === verboseEntries.length,
    "The npm artifact has an invalid archive index."
  );

  const entries = new Map();
  const filePaths = new Set();
  for (let index = 0; index < archiveNames.length; index += 1) {
    const archivePath = archiveNames[index];
    const type = verboseEntries[index][0];
    const mode = verboseEntries[index].slice(0, 10);
    assert(
      type === "-" || type === "d",
      "Only regular files and directories are allowed in the npm artifact."
    );
    assert(
      !/[\u0000-\u001f\u007f\\]/.test(archivePath),
      "The npm artifact contains an unsafe path."
    );
    assert(
      archivePath === "package/" || archivePath.startsWith("package/"),
      "The npm artifact contains a path outside its package root."
    );
    assert(
      path.posix.normalize(archivePath) === archivePath,
      "The npm artifact contains an unsafe path."
    );

    const relativePath = archivePath.slice("package/".length);
    if (relativePath.length === 0) {
      assert(
        type === "d",
        "The npm artifact package root must be a directory."
      );
      assert(!entries.has(""), "The npm artifact contains duplicate paths.");
      entries.set("", { mode, type });
      continue;
    }

    const canonicalPath =
      type === "d" && relativePath.endsWith("/")
        ? relativePath.slice(0, -1)
        : relativePath;
    const segments = canonicalPath.split("/");
    assert(
      canonicalPath.length > 0 &&
        segments.every((segment) => segment !== "." && segment !== ".."),
      "The npm artifact contains an unsafe path."
    );
    assert(
      type === "d" || !relativePath.endsWith("/"),
      "A regular file in the npm artifact has an invalid path."
    );
    assert(
      !entries.has(canonicalPath),
      "The npm artifact contains duplicate paths."
    );
    entries.set(canonicalPath, { mode, type });
    if (type === "-") {
      filePaths.add(canonicalPath);
    }
  }
  return { entries, filePaths };
}

function extractArchive(artifactPath, extractionRoot) {
  fs.mkdirSync(extractionRoot, { recursive: true });
  try {
    execFileSync(
      process.platform === "win32" ? "tar.exe" : "tar",
      ["-xzf", artifactPath, "-C", extractionRoot],
      { stdio: "ignore" }
    );
  } catch {
    throw new Error("The npm artifact could not be extracted.");
  }

  const extractedPackageRoot = path.join(extractionRoot, "package");
  let packageRootStats;
  try {
    packageRootStats = fs.lstatSync(extractedPackageRoot);
  } catch {
    throw new Error("The npm artifact has no package directory.");
  }
  assert(
    packageRootStats.isDirectory() && !packageRootStats.isSymbolicLink(),
    "The npm artifact package root is not a regular directory."
  );
  return extractedPackageRoot;
}

function packSource(destinationRoot) {
  fs.mkdirSync(destinationRoot, { recursive: true });
  let packOutput;
  try {
    packOutput = execFileSync(
      process.platform === "win32" ? "npm.cmd" : "npm",
      [
        "pack",
        "--ignore-scripts",
        "--json",
        "--pack-destination",
        destinationRoot,
        ".",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: {
          ...process.env,
          NPM_CONFIG_CACHE: path.join(destinationRoot, "npm-cache"),
        },
        stdio: ["ignore", "pipe", "pipe"],
      }
    );
  } catch {
    throw new Error("npm failed to create the package-verification tarball.");
  }

  let packResult;
  try {
    packResult = JSON.parse(packOutput);
  } catch {
    throw new Error("npm returned malformed package metadata.");
  }
  assert(
    Array.isArray(packResult) && packResult.length === 1,
    "npm must produce exactly one package tarball."
  );

  const [artifactMetadata] = packResult;
  assert(
    artifactMetadata?.name === sourcePackage.name &&
      artifactMetadata?.version === sourcePackage.version &&
      artifactMetadata?.filename === expectedFilename,
    "The packed artifact identity does not match package.json."
  );
  assert(
    Array.isArray(artifactMetadata.files) &&
      artifactMetadata.files.every(
        (entry) => entry && typeof entry.path === "string"
      ),
    "npm returned invalid package file metadata."
  );

  const metadataPaths = new Set(
    artifactMetadata.files.map((entry) => entry.path)
  );
  assert(
    metadataPaths.size === artifactMetadata.files.length,
    "npm returned duplicate package file metadata."
  );

  const artifactPath = path.join(destinationRoot, artifactMetadata.filename);
  assert(fs.existsSync(artifactPath), "The package tarball was not created.");
  return { artifactPath, metadataPaths };
}

function compareExtractedContents(leftRoot, rightRoot, relativePaths) {
  for (const relativePath of relativePaths) {
    const left = fs.readFileSync(path.join(leftRoot, relativePath));
    const right = fs.readFileSync(path.join(rightRoot, relativePath));
    assert(
      left.equals(right),
      "The supplied npm artifact does not match a fresh pack of the source tree."
    );
  }
}

const secretPatterns = [
  {
    label: "private key",
    pattern:
      /-----BEGIN (?:RSA |EC |DSA |OPENSSH |ENCRYPTED )?PRIVATE KEY-----/,
  },
  {
    label: "npm access token",
    pattern: /\bnpm_[A-Za-z0-9]{20,}\b/,
  },
  {
    label: "GitHub access token",
    pattern:
      /\b(?:gh[pousr]_[A-Za-z0-9]{30,}|github_pat_[A-Za-z0-9_]{40,})\b/,
  },
  {
    label: "Sentry access token",
    pattern: /\bsntry[us]_[A-Za-z0-9_-]{20,}\b/,
  },
  {
    label: "Expo access token",
    pattern: /\bexpo_[A-Za-z0-9_-]{30,}\b/,
  },
  {
    label: "AWS access key",
    pattern: /\b(?:AKIA|ASIA)[A-Z0-9]{16}\b/,
  },
  {
    label: "Google API key",
    pattern: /\bAIza[0-9A-Za-z_-]{35}\b/,
  },
  {
    label: "signed request credential",
    pattern: /\bX-(?:Amz|Goog)-Signature=[0-9A-Fa-f]{32,}\b/,
  },
  {
    label: "npm authentication token",
    pattern: /(?:^|\n)\s*\/\/[^\s=]+\/:_authToken\s*=\s*[^\s"'${}<>]{12,}/,
  },
];

function scanForSecrets(packageRoot, relativePaths) {
  for (const relativePath of relativePaths) {
    const contents = fs.readFileSync(path.join(packageRoot, relativePath));
    const text = contents.toString("utf8");
    for (const { label, pattern } of secretPatterns) {
      assert(
        !pattern.test(text),
        `The npm artifact contains a possible ${label}; matched values were intentionally not printed.`
      );
    }
  }
}

const requiredFiles = [
  "package.json",
  sourcePackage.main,
  sourcePackage.types,
  "app.plugin.js",
  "plugin/build/index.js",
  "expo-module.config.json",
  "android/build.gradle",
  "android/src/main/java/expo/modules/musiclibrary/ExpoMusicLibraryModule.kt",
  "ios/ExpoMusicLibrary.podspec",
  "ios/ExpoMusicLibraryModule.swift",
  "README.md",
  "CHANGELOG.md",
  "LICENSE",
];

const forbiddenPrefixes = [
  ".github/",
  "android/build/",
  "example/",
  "ios/Pods/",
  "node_modules/",
  "plugin/src/",
  "screenshots/",
  "scripts/",
  "src/",
];

assert(
  Array.isArray(sourcePackage.files) &&
    sourcePackage.files.includes("app.plugin.js"),
  'package.json "files" must include app.plugin.js.'
);
assert(
  sourcePackage.dependencies?.["@expo/config-plugins"],
  "package.json dependencies must include @expo/config-plugins because the config plugin loads it at runtime."
);
assert(
  !sourcePackage.files.includes("android") &&
    sourcePackage.files.includes("android/build.gradle") &&
    sourcePackage.files.includes("android/src"),
  "Android source must be published explicitly without generated android/build output."
);
assertNoInstallLifecycleScripts(sourcePackage, "The source package.json");

const temporaryRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "expo-music-library-package-")
);

try {
  const freshPack = packSource(path.join(temporaryRoot, "fresh-pack"));
  const freshArchive = inspectArchive(freshPack.artifactPath);
  assert(
    setsMatch(freshArchive.filePaths, freshPack.metadataPaths),
    "The fresh tarball contents do not match npm's package metadata."
  );

  let artifactPath = freshPack.artifactPath;

  if (suppliedArtifact) {
    const suppliedArtifactPath = path.resolve(root, suppliedArtifact);
    assert(
      path.basename(suppliedArtifactPath) === expectedFilename,
      `The supplied artifact must be named ${expectedFilename}.`
    );
    assert(
      fs.existsSync(suppliedArtifactPath),
      "The supplied npm artifact is missing."
    );
    const snapshotRoot = path.join(temporaryRoot, "supplied-snapshot");
    fs.mkdirSync(snapshotRoot, { recursive: true });
    artifactPath = path.join(snapshotRoot, expectedFilename);
    try {
      fs.copyFileSync(suppliedArtifactPath, artifactPath);
    } catch {
      throw new Error(
        "The supplied npm artifact could not be copied for verification."
      );
    }
  }

  const archive =
    artifactPath === freshPack.artifactPath
      ? freshArchive
      : inspectArchive(artifactPath);
  const archivePaths = archive.filePaths;

  for (const relativePath of requiredFiles) {
    assert(
      archivePaths.has(relativePath),
      `Required package file is missing from the tarball: ${relativePath}`
    );
  }
  for (const relativePath of archivePaths) {
    assert(
      !forbiddenPrefixes.some((prefix) => relativePath.startsWith(prefix)),
      `Forbidden path is present in the tarball: ${relativePath}`
    );
    assert(
      !/(^|\/)(\.env[^/]*|.*\.(jks|keystore|mobileprovision|p8|p12|pem))$/i.test(
        relativePath
      ),
      "A credential-bearing file is present in the tarball."
    );
  }

  if (suppliedArtifact) {
    assert(
      entryMapsMatch(archive.entries, freshArchive.entries),
      "The supplied npm artifact does not match a fresh pack of the source tree."
    );
  }

  const freshPackageRoot = extractArchive(
    freshPack.artifactPath,
    path.join(temporaryRoot, "fresh-extracted")
  );
  const freshExtractedPaths = new Set(listFiles(freshPackageRoot));
  assert(
    setsMatch(freshExtractedPaths, freshArchive.filePaths),
    "The fresh tarball contents do not match its archive index."
  );

  const extractedPackageRoot = suppliedArtifact
    ? extractArchive(
        artifactPath,
        path.join(temporaryRoot, "supplied-extracted")
      )
    : freshPackageRoot;
  const extractedPaths = new Set(listFiles(extractedPackageRoot));
  assert(
    setsMatch(extractedPaths, archivePaths),
    "The extracted tarball contents do not match its archive index."
  );

  let packedPackage;
  try {
    packedPackage = JSON.parse(
      fs.readFileSync(
        path.join(extractedPackageRoot, "package.json"),
        "utf8"
      )
    );
  } catch {
    throw new Error("The package.json inside the tarball is not valid JSON.");
  }
  assertNoInstallLifecycleScripts(
    packedPackage,
    "The packed package.json"
  );
  assert(
    isDeepStrictEqual(packedPackage, sourcePackage),
    "The package.json inside the tarball does not match the source package."
  );

  scanForSecrets(extractedPackageRoot, extractedPaths);
  if (suppliedArtifact) {
    compareExtractedContents(
      extractedPackageRoot,
      freshPackageRoot,
      extractedPaths
    );
  }

  const extractedNodeModules = path.join(
    extractedPackageRoot,
    "node_modules"
  );
  const expoScope = path.join(extractedNodeModules, "@expo");
  fs.mkdirSync(expoScope, { recursive: true });

  const configPluginsPath = path.join(
    root,
    "node_modules",
    "@expo",
    "config-plugins"
  );
  assert(
    fs.existsSync(configPluginsPath),
    "Install package dependencies before verifying config-plugin resolution."
  );
  fs.symlinkSync(
    configPluginsPath,
    path.join(expoScope, "config-plugins"),
    process.platform === "win32" ? "junction" : "dir"
  );

  // Expo's Metro-targeted output uses extensionless ESM imports, so executing
  // it directly in Node would not model a React Native consumer. Syntax-check
  // every packed JavaScript file and let the Jest API tests exercise behavior.
  for (const relativePath of extractedPaths) {
    if (!relativePath.startsWith("build/") || !relativePath.endsWith(".js")) {
      continue;
    }
    try {
      execFileSync(
        process.execPath,
        ["--check", path.join(extractedPackageRoot, relativePath)],
        { stdio: "ignore" }
      );
    } catch {
      throw new Error(`Packed JavaScript is invalid: ${relativePath}`);
    }
  }

  const pluginModule = require(path.join(
    extractedPackageRoot,
    "app.plugin.js"
  ));
  const plugin = pluginModule.default ?? pluginModule;
  assert(
    typeof plugin === "function",
    "The packed config-plugin entry point is not loadable."
  );

  const consumerRoot = path.join(temporaryRoot, "consumer");
  const consumerNodeModules = path.join(consumerRoot, "node_modules");
  fs.mkdirSync(consumerNodeModules, { recursive: true });
  fs.symlinkSync(
    extractedPackageRoot,
    path.join(consumerNodeModules, packedPackage.name),
    process.platform === "win32" ? "junction" : "dir"
  );

  const resolvedPlugin = resolveConfigPluginFunctionWithInfo(
    consumerRoot,
    packedPackage.name
  );
  assert(
    resolvedPlugin.isPluginFile &&
      path.basename(resolvedPlugin.pluginFile) === "app.plugin.js",
    `Expo did not resolve ${packedPackage.name} through its packed root config-plugin entry point.`
  );

  console.log(
    `Verified ${packedPackage.name}@${packedPackage.version} from the exact npm tarball (${archivePaths.size} files).`
  );
} finally {
  fs.rmSync(temporaryRoot, { recursive: true, force: true });
}
