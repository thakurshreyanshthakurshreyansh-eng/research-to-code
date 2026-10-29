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
const frontendSecurityHeaders = [
  "content-security-policy",
  "x-content-type-options",
  "x-frame-options",
  "referrer-policy",
  "strict-transport-security"
];
console.log("Frontend response security headers: " + JSON.stringify(Object.fromEntries(frontendSecurityHeaders.map(name => [name, frontend.headers.get(name)]))));
for (const name of ["content-security-policy", "x-frame-options", "referrer-policy"]) {
  assert.ok(frontend.headers.has(name), "Frontend response missing required security header: " + name);
}
const frontendCsp = frontend.headers.get("content-security-policy") || "";
for (const directive of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "https://research-to-code-api.onrender.com", "https://*.supabase.co"]) {
  assert.ok(frontendCsp.includes(directive), "Frontend CSP is missing required directive/source: " + directive);
}
assert.ok(!/connect-src\\s+'self'\\s+https:;/i.test(frontendCsp), "Frontend CSP must not permit arbitrary HTTPS connections");
assert.equal((frontend.headers.get("x-frame-options") || "").toUpperCase(), "DENY", "Frontend must reject framing");
assert.equal(frontend.headers.get("referrer-policy"), "no-referrer", "Frontend referrer policy must be explicit");
assert.equal(frontend.headers.get("x-content-type-options"), "nosniff", "Frontend must block MIME sniffing");
assert.ok((frontend.headers.get("strict-transport-security") || "").toLowerCase().startsWith("max-age="), "Frontend HSTS must be present");
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
assert.equal((api.headers.get("x-frame-options") || "").toUpperCase(), "DENY", "API must reject framing");
assert.equal(api.headers.get("referrer-policy"), "no-referrer", "API must suppress referrers");
const apiCsp = api.headers.get("content-security-policy") || "";
assert.ok(apiCsp.includes("default-src 'none'") && apiCsp.includes("frame-ancestors 'none'"), "API CSP must deny browser content and framing");
assert.ok((api.headers.get("strict-transport-security") || "").toLowerCase().startsWith("max-age="), "API HSTS must be present");

console.log("PASS live frontend: HTTP 200, app shell, entry gate, demo disabled, core controls");
console.log("PASS live API: HTTP 200, health JSON, five security headers");
