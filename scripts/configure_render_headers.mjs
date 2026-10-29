import { pathToFileURL } from "node:url";

const API_BASE = (process.env.RENDER_API_BASE || "https://api.render.com/v1").replace(/\\/$/, "");
const SERVICE_ID = process.env.RENDER_FRONTEND_SERVICE_ID || "srv-dbhk0o8473hc73a6u22g";

export const REQUIRED_HEADERS = Object.freeze([
  {
    path: "/*",
    name: "Content-Security-Policy",
    value: "default-src 'self'; base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self' https://api.razorpay.com https://checkout.razorpay.com; img-src 'self' data: blob:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net https://checkout.razorpay.com; worker-src 'self' blob: https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; connect-src 'self' https://*.supabase.co https://*.workers.dev https://research-to-code-api.onrender.com https://api.razorpay.com https://checkout.razorpay.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net; frame-src https://api.razorpay.com https://checkout.razorpay.com; font-src 'self' data:"
  },
  { path: "/*", name: "X-Frame-Options", value: "DENY" },
  { path: "/*", name: "Referrer-Policy", value: "no-referrer" }
]);

function unwrapRule(item) {
  const rule = item && typeof item === "object" ? (item.header || item.rule || item) : null;
  if (!rule || typeof rule.path !== "string" || typeof rule.name !== "string" || typeof rule.value !== "string") {
    throw new Error("Render returned an unrecognized header-rule response; refusing to replace rules.");
  }
  return { path: rule.path, name: rule.name, value: rule.value };
}

function extractPage(payload, response) {
  let items;
  if (Array.isArray(payload)) items = payload;
  else if (payload && typeof payload === "object") {
    items = [payload.headers, payload.items, payload.data, payload.results].find(Array.isArray);
  }
  if (!items) throw new Error("Render header-list response did not contain a recognizable rules array; refusing to replace rules.");
  const cursor = (payload && !Array.isArray(payload) &&
      (payload.cursor || payload.nextCursor || payload.next_cursor || payload.pagination?.cursor)) ||
      response.headers.get("x-next-cursor") || null;
  return { rules: items.map(unwrapRule), cursor: cursor ? String(cursor) : null };
}

async function fetchAllRules(fetchImpl, apiKey, serviceId, apiBase) {
  const rules = [];
  let cursor = null;
  const seenCursors = new Set();
  for (let pageNumber = 0; pageNumber < 100; pageNumber++) {
    const url = new URL(`${apiBase}/services/${encodeURIComponent(serviceId)}/headers`);
    url.searchParams.set("limit", "100");
    if (cursor) url.searchParams.set("cursor", cursor);
    const response = await fetchImpl(url, {
      method: "GET",
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json" }
    });
    if (!response.ok) {
      throw new Error(`Render header-list request failed with HTTP ${response.status}; check the API key and service permissions.`);
    }
    const page = extractPage(await response.json(), response);
    rules.push(...page.rules);
    if (!page.cursor) {
      if (page.rules.length === 100) {
        throw new Error("Render returned a full page without a pagination cursor; refusing to replace potentially incomplete header rules.");
      }
      return rules;
    }
    if (seenCursors.has(page.cursor)) throw new Error("Render header-list pagination repeated a cursor; refusing to replace rules.");
    seenCursors.add(page.cursor);
    cursor = page.cursor;
  }
  throw new Error("Render header-list pagination exceeded its safety limit; refusing to replace rules.");
}

function keyOf(rule) {
  return `${rule.path.toLowerCase()}\\n${rule.name.toLowerCase()}`;
}

function sameRules(a, b) {
  return a.length === b.length && a.every((rule, index) =>
    rule.path === b[index].path && rule.name.toLowerCase() === b[index].name.toLowerCase() && rule.value === b[index].value);
}

export async function configureRenderHeaders({
  apiKey,
  serviceId = SERVICE_ID,
  apiBase = API_BASE,
  fetchImpl = fetch
} = {}) {
  if (typeof apiKey !== "string" || !apiKey.trim()) throw new Error("RENDER_API_KEY is required; no changes were made.");
  if (typeof serviceId !== "string" || !/^srv-[a-zA-Z0-9]+$/.test(serviceId)) throw new Error("RENDER_FRONTEND_SERVICE_ID is invalid; no changes were made.");
  if (typeof fetchImpl !== "function") throw new Error("A fetch implementation is required.");
  const base = apiBase.replace(/\\/$/, "");
  const current = await fetchAllRules(fetchImpl, apiKey, serviceId, base);
  const desiredKeys = new Set(REQUIRED_HEADERS.map(keyOf));
  const groups = new Map();
  for (const rule of current) {
    const key = keyOf(rule);
    if (desiredKeys.has(key)) {
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(rule);
    }
  }
  const alreadyCorrect = REQUIRED_HEADERS.every(required => {
    const matches = groups.get(keyOf(required)) || [];
    return matches.length === 1 && matches[0].value === required.value;
  });

  if (!alreadyCorrect) {
    const retained = current.filter(rule => !desiredKeys.has(keyOf(rule)));
    const replacement = [...retained, ...REQUIRED_HEADERS].map(({ path, name, value }) => ({ path, name, value }));
    const response = await fetchImpl(`${base}/services/${encodeURIComponent(serviceId)}/headers`, {
      method: "PUT",
      headers: {
        authorization: `Bearer ${apiKey}`,
        accept: "application/json",
        "content-type": "application/json"
      },
      body: JSON.stringify(replacement)
    });
    if (!response.ok) {
      throw new Error(`Render header replacement failed with HTTP ${response.status}; check API key scope. Existing rules were not reported as updated.`);
    }
  }

  const verified = await fetchAllRules(fetchImpl, apiKey, serviceId, base);
  for (const required of REQUIRED_HEADERS) {
    const matches = verified.filter(rule => keyOf(rule) === keyOf(required));
    if (matches.length !== 1 || matches[0].value !== required.value) {
      throw new Error(`Render API verification failed for ${required.name}; live smoke test must remain blocked.`);
    }
  }
  return { changed: !alreadyCorrect, totalRules: verified.length, applied: REQUIRED_HEADERS.map(({ name }) => name) };
}

async function main() {
  const result = await configureRenderHeaders({ apiKey: process.env.RENDER_API_KEY });
  console.log(`${result.changed ? "Updated" : "Already correct"} Render security headers for ${SERVICE_ID}; verified ${result.applied.join(", ")}. Preserved ${result.totalRules - result.applied.length} unrelated header rules.`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch(error => {
    console.error(`Render security-header configuration failed: ${error.message}`);
    process.exitCode = 1;
  });
}
