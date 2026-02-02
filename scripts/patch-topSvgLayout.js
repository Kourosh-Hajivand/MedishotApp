#!/usr/bin/env node
/**
 * Patches React Native ReactFabric-dev.js to ignore topSvgLayout event
 * (react-native-svg dispatches this but Fabric doesn't register it yet)
 */
const fs = require("fs");
const path = require("path");

const targetPath = path.join(
  __dirname,
  "../node_modules/react-native/Libraries/Renderer/implementations/ReactFabric-dev.js"
);

if (!fs.existsSync(targetPath)) {
  console.warn("patch-topSvgLayout: ReactFabric-dev.js not found, skipping");
  process.exit(0);
}

let content = fs.readFileSync(targetPath, "utf8");

if (content.includes("topSvgLayout")) {
  console.log("patch-topSvgLayout: Already patched");
  process.exit(0);
}

const step1 = content.replace(
  "if (!bubbleDispatchConfig && !directDispatchConfig)\n            throw Error(",
  "if (!bubbleDispatchConfig && !directDispatchConfig) {\n            if (topLevelType === 'topSvgLayout') return null;\n            throw Error("
);
if (step1 === content) {
  console.warn("patch-topSvgLayout: Could not find target (React Native version may have changed)");
  process.exit(0);
}
content = step1.replace(
  '" dispatched\'\n            );',
  '" dispatched\'\n            );\n          }'
);
fs.writeFileSync(targetPath, content);
console.log("patch-topSvgLayout: Applied topSvgLayout fix");
