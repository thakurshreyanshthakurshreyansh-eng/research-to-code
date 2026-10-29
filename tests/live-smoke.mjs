// Live smoke checks for the deployed Render sites. Uses only Node's built-in fetch.
import assert from "node:assert/strict";

const frontendUrl = process.env.FRONTEND_URL || "https://research-to-code.onrender.com/";
const apiHealthUrl = process.env.API_HEALTH_URL || "https://research-to-code-api.onrender.com/health";

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function get(url, label) {
  let lastError;
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await fetch(url, {
        redirect: "follow",
        signal: AbortSignal.timeout(30000),
        headers: { "user-agent": "research-to-code-live-smoke/1.0" }
      });
      if (response.status === 200) return response;
      lastError = new Error(label + " should return HTTP 200, got " + response.status);
      await response.body?.cancel().catch(() => {});
      if (response.status < 500 && response.status !== 429) throw lastError;
    } catch (error) {
      lastError = error;
    }
    if (attempt < 3) await sleep(8000);
  }
  throw lastError || new Error(label + " failed without a response");
}

const frontend = await get(frontendUrl, "Frontend");
const html = await frontend.text();
assert.ok(html.toLowerCase().includes("<html"), "Frontend should serve HTML");
assert.match(html, /Research to Code/i, "Expected app title/brand missing");
assert.match(html, /id="gateScreen"/, "Login/entry gate missing from deployed bundle");
assert.match(html, /DEMO_PREVIEW_BUILD=false/, "Deployed bundle must not enable preview/demo access");
assert.match(html, /id="themeToggle"/, "Theme control missing from deployed bundle");
assert.match(html, /id="pdf"/, "PDF upload control missing from deployed bundle");
assert.match(html, /id="aiConsent"/, "AI consent control missing from deployed bundle");

const api = await get(apiHealthUrl, "API health endpoint");
const health = await api.json();
assert.deepEqual(health, { status: "ok", service: "research-to-code-api" }, "Unexpected API health response");
for (const name of [
  "x-content-type-options",
  "x-frame-options",
  "content-security-policy",
  "referrer-policy",
  "strict-transport-security"
]) {
  assert.ok(api.headers.has(name), "API response missing security header: " + name);
}
assert.equal(api.headers.get("x-content-type-options"), "nosniff");

console.log("PASS live frontend: HTTP 200, app shell, entry gate, demo disabled, core controls");
console.log("PASS live API: HTTP 200, health JSON, five security headers");
