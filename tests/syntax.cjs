const fs = require("node:fs");
const path = require("node:path");
const targets = ["index.html", "worker/worker.js"];
for (const target of targets) {
  if (!fs.existsSync(path.join(process.cwd(), target))) {
    console.error("Missing required file:", target);
    process.exitCode = 1;
  }
}
if (!process.exitCode) console.log("Required source files exist.");
