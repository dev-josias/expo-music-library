const pkg = require("../package.json");

const tag = process.argv[2] ?? process.env.GITHUB_REF_NAME;
const expectedTag = `v${pkg.version}`;

if (!tag) {
  throw new Error(`A release tag is required (expected ${expectedTag}).`);
}

if (tag !== expectedTag) {
  throw new Error(
    `Release tag ${tag} does not match package version ${pkg.version}; expected ${expectedTag}.`
  );
}

console.log(`Release tag ${tag} matches package.json.`);
