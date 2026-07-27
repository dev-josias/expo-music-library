const pkg = require("../package.json");
const fs = require("node:fs");
const path = require("node:path");

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
const expectedTag = `v${pkg.version}`;
const stableVersionPattern = /^\d+\.\d+\.\d+$/;

if (
  pkg.name !== "expo-music-library" ||
  !stableVersionPattern.test(pkg.version)
) {
  throw new Error(
    "package.json must contain the expected package identity and a stable semantic version."
  );
}

if (!tag) {
  throw new Error(`A release tag is required (expected ${expectedTag}).`);
}

if (!/^v\d+\.\d+\.\d+$/.test(tag) || tag !== expectedTag) {
  throw new Error(
    `The release tag does not match package version ${pkg.version}; expected ${expectedTag}.`
  );
}

const changelog = fs.readFileSync(
  path.join(__dirname, "..", "CHANGELOG.md"),
  "utf8"
);
if (!changelog.includes(`## [${pkg.version}] - `)) {
  throw new Error(
    `CHANGELOG.md must contain a release heading for ${pkg.version}.`
  );
}

console.log(`Release tag ${tag} matches package.json.`);
