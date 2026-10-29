const { spawnSync } = require("node:child_process");
const commands = [
  [process.execPath, ["tests/syntax.cjs"]],
  [process.execPath, ["tests/static-audit.cjs"]]
];
for (const [command, args] of commands) {
  const result = spawnSync(command, args, { stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
}
