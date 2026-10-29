const fs = require("node:fs");
const required = ["index.html", "privacy.html", "terms.html", "manifest.webmanifest"];
const missing = required.filter(file => !fs.existsSync(file));
if (missing.length) {
  console.error("Missing files:", missing.join(", "));
  process.exit(1);
}
console.log("Static file audit passed.");
