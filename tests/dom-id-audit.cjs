// Audit static DOM IDs against the application's common lookup helpers.
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");
const html = fs.readFileSync(path.join(__dirname, "..", "index.html"), "utf8");
const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, "Duplicate static HTML IDs found");
const idSet = new Set(ids);
const refs = [
  ...[...html.matchAll(/\$\(\s*["']([A-Za-z][\w-]*)["']\s*\)/g)].map(m => m[1]),
  ...[...html.matchAll(/getElementById\(\s*["']([A-Za-z][\w-]*)["']\s*\)/g)].map(m => m[1])
];
const missing = [...new Set(refs.filter(id => !idSet.has(id)))];
assert.deepEqual(missing, [], "DOM lookups reference missing static IDs: " + missing.join(", "));
console.log(\`PASS DOM ID audit: \${ids.length} unique IDs, \${refs.length} static lookups, no missing references\`);
