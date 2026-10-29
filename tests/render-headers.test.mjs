import assert from "node:assert/strict";
import { configureRenderHeaders, REQUIRED_HEADERS } from "../scripts/configure_render_headers.mjs";

const ok = (body, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: { "content-type": "application/json" }
});
const normalize = rules => rules.map(rule => ({
  path: rule.path, name: rule.name, value: rule.value
}));

function makeApi(initialRules = []) {
  const state = { rules: normalize(initialRules), calls: [] };
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input);
    const method = options.method || "GET";
    state.calls.push({ method, url, options });
    assert.equal(options.headers.authorization, "Bearer unit-test-token");
    assert.match(url.pathname, /\/services\/srv-test123\/headers$/);
    if (method === "GET") return ok({
      headers: state.rules.map(header => ({ header })),
      cursor: null
    });
    if (method === "PUT") {
      state.rules = JSON.parse(options.body);
      return ok(state.rules);
    }
    throw new Error("Unexpected method " + method);
  };
  return { state, fetchImpl };
}

async function run(name, fn) {
  await fn();
  console.log("PASS", name);
}

await run("adds required headers while preserving unrelated host rules", async () => {
  const { state, fetchImpl } = makeApi([
    { path: "/*", name: "X-Content-Type-Options", value: "nosniff" },
    { path: "/*", name: "Strict-Transport-Security", value: "max-age=31536000" },
    { path: "/*", name: "X-Frame-Options", value: "SAMEORIGIN" }
  ]);
  const result = await configureRenderHeaders({
    apiKey: "unit-test-token",
    serviceId: "srv-test123",
    apiBase: "https://render.example/v1",
    fetchImpl
  });
  assert.equal(result.changed, true);
  assert.equal(result.applied.length, 5);
  assert.equal(state.calls.filter(call => call.method === "PUT").length, 1);
  for (const required of REQUIRED_HEADERS) {
    assert.equal(state.rules.filter(rule => rule.path === required.path && rule.name.toLowerCase() === required.name.toLowerCase()).length, 1);
    assert.equal(state.rules.find(rule => rule.path === required.path && rule.name.toLowerCase() === required.name.toLowerCase()).value, required.value);
  }
  assert(state.rules.some(rule => rule.name === "X-Content-Type-Options" && rule.value === "nosniff"));
  assert(state.rules.some(rule => rule.name === "Strict-Transport-Security" && rule.value === "max-age=31536000"));
});

await run("is idempotent after the required rules are in place", async () => {
  const { state, fetchImpl } = makeApi(REQUIRED_HEADERS);
  const result = await configureRenderHeaders({
    apiKey: "unit-test-token", serviceId: "srv-test123",
    apiBase: "https://render.example/v1", fetchImpl
  });
  assert.equal(result.changed, false);
  assert.equal(state.calls.filter(call => call.method === "PUT").length, 0);
});

await run("loads paginated header rules before replacing them", async () => {
  const state = { rules: [], calls: [], wrote: false };
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input), method = options.method || "GET";
    state.calls.push({ method, cursor: url.searchParams.get("cursor") });
    if (method === "GET" && !state.wrote && !url.searchParams.has("cursor")) {
      return ok({ headers: [{ header: { path: "/*", name: "X-Custom-Header", value: "keep" } }], cursor: "page-two" });
    }
    if (method === "GET" && !state.wrote && url.searchParams.get("cursor") === "page-two") {
      return ok({ headers: [{ header: { path: "/assets/*", name: "Cache-Control", value: "public" } }], cursor: null });
    }
    if (method === "PUT") {
      state.wrote = true;
      state.rules = JSON.parse(options.body);
      return ok(state.rules);
    }
    if (method === "GET" && state.wrote) return ok({ headers: state.rules.map(header => ({ header })), cursor: null });
    throw new Error("Unexpected pagination request");
  };
  await configureRenderHeaders({
    apiKey: "unit-test-token", serviceId: "srv-test123",
    apiBase: "https://render.example/v1", fetchImpl
  });
  const put = state.calls.find(call => call.method === "PUT");
  assert(put);
  assert(state.rules.some(rule => rule.name === "X-Custom-Header" && rule.value === "keep"));
  assert(state.rules.some(rule => rule.name === "Cache-Control" && rule.path === "/assets/*"));
  assert.equal(state.calls.filter(call => call.method === "GET" && call.cursor === "page-two").length, 1);
});

await run("fails closed on missing credentials or inaccessible Render API", async () => {
  let called = false;
  await assert.rejects(
    configureRenderHeaders({ apiKey: "", serviceId: "srv-test123", fetchImpl: async () => { called = true; } }),
    /RENDER_API_KEY is required/
  );
  assert.equal(called, false);
  const fetchImpl = async () => ok({ error: "unauthorized" }, 401);
  await assert.rejects(
    configureRenderHeaders({ apiKey: "unit-test-token", serviceId: "srv-test123", apiBase: "https://render.example/v1", fetchImpl }),
    /HTTP 401/
  );
});


await run("follows the real Render API array-of-header/cursor response shape", async () => {
  const state = { calls: [], rules: [] };
  const fetchImpl = async (input, options = {}) => {
    const url = new URL(input), method = options.method || "GET";
    const cursor = url.searchParams.get("cursor");
    state.calls.push({ method, cursor });
    if (method === "GET" && !state.rules.length && !cursor) {
      return ok([
        { header: { id: "hdr-1", path: "/*", name: "X-Custom-One", value: "keep" }, cursor: "cursor-page-2" }
      ]);
    }
    if (method === "GET" && !state.rules.length && cursor === "cursor-page-2") {
      return ok([
        { header: { id: "hdr-2", path: "/assets/*", name: "Cache-Control", value: "public" }, cursor: "" }
      ]);
    }
    if (method === "PUT") {
      state.rules = JSON.parse(options.body);
      return ok(state.rules);
    }
    if (method === "GET" && state.rules.length) return ok(state.rules.map((header, i) => ({ header: { id: "verified-" + i, ...header }, cursor: "" })));
    throw new Error("Unexpected Render API request " + method + " cursor=" + cursor);
  };
  await configureRenderHeaders({ apiKey: "unit-test-token", serviceId: "srv-test123", apiBase: "https://render.example/v1", fetchImpl });
  assert(state.calls.some(call => call.method === "GET" && call.cursor === "cursor-page-2"), "must follow the cursor attached to the last returned item");
  assert(state.rules.some(rule => rule.name === "X-Custom-One" && rule.value === "keep"), "must preserve first-page rules");
  assert(state.rules.some(rule => rule.name === "Cache-Control" && rule.path === "/assets/*"), "must preserve second-page rules");
});

console.log("Render security-header automation tests passed");
