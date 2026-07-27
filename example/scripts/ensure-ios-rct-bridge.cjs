const fs = require("node:fs");
const path = require("node:path");

const iosRoot = path.resolve(__dirname, "..", "ios");
const bridgeImport = "#import <React/RCTBridge.h>";

if (!fs.existsSync(iosRoot)) {
  throw new Error("Generate the iOS project before patching its bridge header.");
}

const bridgeHeaders = fs
  .readdirSync(iosRoot, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .flatMap((entry) => {
    const projectDirectory = path.join(iosRoot, entry.name);
    return fs
      .readdirSync(projectDirectory, { withFileTypes: true })
      .filter(
        (candidate) =>
          candidate.isFile() &&
          candidate.name.endsWith("-Bridging-Header.h")
      )
      .map((candidate) => path.join(projectDirectory, candidate.name));
  });

if (bridgeHeaders.length !== 1) {
  throw new Error(
    `Expected one generated iOS bridging header, found ${bridgeHeaders.length}.`
  );
}

const [bridgeHeader] = bridgeHeaders;
const contents = fs.readFileSync(bridgeHeader, "utf8");
if (!contents.includes(bridgeImport)) {
  fs.writeFileSync(bridgeHeader, `${contents.trimEnd()}\n\n${bridgeImport}\n`);
}

console.log("Ensured the generated iOS app can resolve RCTBridge.");
