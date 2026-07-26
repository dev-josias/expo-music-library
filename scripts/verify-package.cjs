const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const {
  resolveConfigPluginFunctionWithInfo,
} = require("@expo/config-plugins/build/utils/plugin-resolver");

const root = path.resolve(__dirname, "..");
const pkg = require(path.join(root, "package.json"));

const requiredFiles = [
  pkg.main,
  pkg.types,
  "app.plugin.js",
  "plugin/build/index.js",
  "expo-module.config.json",
  "LICENSE",
  "CHANGELOG.md",
];

for (const relativePath of requiredFiles) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Required package file is missing: ${relativePath}`);
  }
}

const pluginModule = require(path.join(root, "app.plugin.js"));
const plugin = pluginModule.default ?? pluginModule;
if (typeof plugin !== "function") {
  throw new Error("app.plugin.js does not resolve to a config plugin function.");
}

if (!Array.isArray(pkg.files) || !pkg.files.includes("app.plugin.js")) {
  throw new Error('package.json "files" must include app.plugin.js.');
}

if (!pkg.dependencies?.["@expo/config-plugins"]) {
  throw new Error(
    'package.json "dependencies" must include @expo/config-plugins because app.plugin.js loads it at runtime.'
  );
}

if (
  pkg.files.includes("android") ||
  !pkg.files.includes("android/build.gradle") ||
  !pkg.files.includes("android/src")
) {
  throw new Error(
    'package.json "files" must publish Android source explicitly without including generated android/build output.'
  );
}

const consumerRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "expo-music-library-consumer-")
);
try {
  const consumerNodeModules = path.join(consumerRoot, "node_modules");
  fs.mkdirSync(consumerNodeModules);
  fs.symlinkSync(
    root,
    path.join(consumerNodeModules, pkg.name),
    process.platform === "win32" ? "junction" : "dir"
  );

  const resolvedPlugin = resolveConfigPluginFunctionWithInfo(
    consumerRoot,
    pkg.name
  );
  if (
    !resolvedPlugin.isPluginFile ||
    path.basename(resolvedPlugin.pluginFile) !== "app.plugin.js"
  ) {
    throw new Error(
      `Expo did not resolve ${pkg.name} through its root app.plugin.js entry point.`
    );
  }
} finally {
  fs.rmSync(consumerRoot, { recursive: true, force: true });
}

console.log(
  `Verified expo-music-library@${pkg.version} package and config-plugin entry points.`
);
