// Research to Code API (Cloudflare Worker). Secrets live in Worker settings, never in the website.
const enc = new TextEncoder();
export async function hmac(secret, msg) {
  const k = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const s = await crypto.subtle.sign("HMAC", k, enc.encode(msg));
  return [...new Uint8Array(s)].map(b => b.toString(16).padStart(2, "0")).join("");
}
export function same(a, b) {
  a = String(a || ""); b = String(b || "");
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
const json = (o, s, h) => new Response(JSON.stringify(o), { status: s || 200, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "referrer-policy": "no-referrer", ...h } });
const db = (env, path, init = {}) => fetch(env.SUPABASE_URL + "/rest/v1/" + path, { ...init, signal: init.signal || AbortSignal.timeout(12000), headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY, "content-type": "application/json", ...init.headers } });
const rows = async res => { if (!res.ok) throw new Error("db " + res.status); return res.json(); };
const q = s => encodeURIComponent(String(s));
// Stage 2 deliberately permits TEST mode only. This blocks accidental live charges,
// even if someone mistakenly turns PAYMENTS_ENABLED on with live credentials.
function testModeReady(env) {
  return env.PAYMENT_MODE === "test" &&
    /^rzp_test_/.test(String(env.RAZORPAY_KEY_ID || "")) &&
    Boolean(env.RAZORPAY_KEY_SECRET) &&
    Boolean(env.RAZORPAY_WEBHOOK_SECRET);
}
async function getUser(req, env) {
  const t = (req.headers.get("authorization") || "").replace(/^Bearer /, "");
  if (!t) return null;
  const r = await fetch(env.SUPABASE_URL + "/auth/v1/user", { headers: { apikey: env.SUPABASE_ANON_KEY, authorization: "Bearer " + t }, signal: AbortSignal.timeout(8000) });
  return r.ok ? r.json() : null;
}
const grant = async (env, oid, pid) => rows(await db(env, "rpc/grant_order", { method: "POST", body: JSON.stringify({ p_order: oid, p_payment: pid }) }));

async function createOrder(env, user, b, cors) {
  if (env.PAYMENTS_ENABLED !== "true") return json({ error: "Payments are switched off." }, 503, cors);
  if (!testModeReady(env)) return json({ error: "Razorpay TEST mode is not configured. Live payments are disabled in this build." }, 503, cors);
  const plans = await rows(await db(env, "plans?active=eq.true&id=eq." + q(b.plan_id || "")));
  if (!plans.length) return json({ error: "Plan not available." }, 404, cors);
  const since = new Date(Date.now() - 36e5).toISOString();
  const recent = await rows(await db(env, "orders?select=id&user_id=eq." + q(user.id) + "&created_at=gte." + since));
  if (recent.length >= 5) return json({ error: "Too many attempts. Try again in an hour." }, 429, cors);
  const p = plans[0];  // the price always comes from our database, never from the browser
  const r = await fetch("https://api.razorpay.com/v1/orders", { method: "POST",
    headers: { "content-type": "application/json", authorization: "Basic " + btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET) },
    body: JSON.stringify({ amount: p.price_paise, currency: "INR", receipt: "rtc_" + crypto.randomUUID().replace(/-/g, "").slice(0, 24), notes: { user_id: user.id, plan_id: p.id } }), signal: AbortSignal.timeout(10000) });
  if (!r.ok) throw new Error("razorpay order " + r.status);
  const o = await r.json();
  await rows(await db(env, "orders", { method: "POST", headers: { prefer: "return=representation" }, body: JSON.stringify({ id: o.id, user_id: user.id, plan_id: p.id, amount_paise: p.price_paise }) }));
  return json({ order_id: o.id, amount: p.price_paise, currency: "INR", key_id: env.RAZORPAY_KEY_ID }, 200, cors);
}
// Ask Razorpay (not the browser, and not the webhook body) what really happened, then decide.
async function confirmPayment(env, oid, pid) {
  if (!testModeReady(env)) throw new Error("Razorpay TEST mode is not configured");
  const order = (await rows(await db(env, "orders?id=eq." + q(oid))))[0];
  if (!order) return "unknown";                       // not one of our orders: ignore
  if (order.status === "paid") return "duplicate";    // already granted once
  const r = await fetch("https://api.razorpay.com/v1/payments/" + q(pid), { headers: { authorization: "Basic " + btoa(env.RAZORPAY_KEY_ID + ":" + env.RAZORPAY_KEY_SECRET) }, signal: AbortSignal.timeout(10000) });
  if (r.status === 404 || r.status === 400) return "mismatch";
  if (!r.ok) throw new Error("razorpay payment " + r.status);
  const p = await r.json();
  if (p.order_id !== oid || p.currency !== "INR" || p.amount !== order.amount_paise || (p.amount_refunded || 0) !== 0) { console.error("payment mismatch for " + oid); return "mismatch"; }
  if (p.status === "captured") return grant(env, oid, pid);
  if (p.status === "failed") { await rows(await db(env, "orders?id=eq." + q(oid) + "&status=eq.created", { method: "PATCH", headers: { prefer: "return=representation" }, body: JSON.stringify({ status: "failed" }) })); return "failed"; }
  if (p.status === "refunded") return "mismatch";
  return "pending";                                   // created or authorized: money not captured yet
}
async function verify(env, user, b, cors) {
  const oid = String(b.razorpay_order_id || ""), pid = String(b.razorpay_payment_id || "");
  const mine = await rows(await db(env, "orders?id=eq." + q(oid) + "&user_id=eq." + q(user.id)));
  if (!mine.length) return json({ error: "Order not found." }, 404, cors);
  if (!same(await hmac(env.RAZORPAY_KEY_SECRET, oid + "|" + pid), b.razorpay_signature)) return json({ status: "failed", error: "Payment could not be verified." }, 400, cors);
  const s = await confirmPayment(env, oid, pid);
  if (s === "paid" || s === "duplicate") return json({ status: s }, 200, cors);
  if (s === "pending") return json({ status: "pending" }, 202, cors);
  return json({ status: "failed", error: "Payment could not be confirmed." }, 400, cors);
}


async function exportAccount(env, user, cors) {
  const uid = q(user.id);
  const [orders, entitlements, usage] = await Promise.all([
    rows(await db(env, "orders?select=id,plan_id,amount_paise,status,payment_id,created_at,paid_at&user_id=eq." + uid + "&order=created_at.desc&limit=1000")),
    rows(await db(env, "entitlements?select=plan_id,expires_at&user_id=eq." + uid)),
    rows(await db(env, "ai_usage_events?select=feature,input_chars,created_at&user_id=eq." + uid + "&order=created_at.desc&limit=5000"))
  ]);
  return json({ exported_at: new Date().toISOString(), account: { id: user.id, email: user.email || null }, orders, entitlements, ai_usage_events: usage, limits: { orders: 1000, ai_usage_events: 5000 } }, 200, { ...cors, "cache-control": "no-store", "content-disposition": 'attachment; filename="research-to-code-account-export.json"' });
}
async function deleteAccount(env, user, b, cors) {
  if (b.confirm !== "DELETE_MY_ACCOUNT") return json({ error: "Explicit account deletion confirmation is required." }, 400, cors);
  if (!env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Account deletion is not configured. Contact the site owner." }, 503, cors);
  const r = await fetch(env.SUPABASE_URL + "/auth/v1/admin/users/" + encodeURIComponent(user.id), { method: "DELETE", headers: { apikey: env.SUPABASE_SERVICE_ROLE_KEY, authorization: "Bearer " + env.SUPABASE_SERVICE_ROLE_KEY }, signal: AbortSignal.timeout(12000) });
  if (!r.ok) { console.error("account deletion provider status", r.status); return json({ error: "Account deletion failed. Your account has not been confirmed as deleted; contact support." }, 502, cors); }
  return json({ deleted: true, message: "Account and linked app records deleted." }, 200, { ...cors, "cache-control": "no-store" });
}

const AI_FEATURES = {
  summary: { system: "You are a careful research assistant. Summarize the supplied research paper text. Separate claims, methods, findings, limitations, and open questions. Do not invent details; state when the excerpt is insufficient." },
  explain: { system: "Explain the research methods, variables, and equations from the supplied paper excerpt in clear English. Preserve mathematical notation when possible. Mark uncertain OCR/extraction and never invent missing equations." },
  improve: { system: "Review the supplied code for correctness, clarity, performance, and security. Return (1) key issues, (2) an improved complete version in a fenced code block, and (3) explanations and caveats. Do not claim to have run the code." },
  tests: { system: "Generate meaningful pytest tests for the supplied Python code, including edge cases and expected behavior. Return only tests in a Python code block plus brief assumptions. Do not claim they were executed." },
  claims: { system: "Perform an evidence audit. From the research excerpt, identify concrete claims and label each as paper-stated, supported by provided code, covered by a specific provided test, contradicted by test output, or unverified. Cite short exact phrases from the supplied excerpt where possible. Never say a test reproduces scientific results unless the evidence explicitly demonstrates that. Clearly separate executed test output from AI inference. If no executed run is supplied, say so." },
  compatibility: { system: "Compare Version A and Version B as a senior cross-runtime code reviewer. Identify behavioral differences, dependencies/imports, API assumptions, language/runtime version constraints, portability risks, likely integration conflicts, and tests needed. Do not assume either version came from a specific model unless stated. Do not claim both versions were executed. End with a short compatibility checklist." },
  fix: { system: "Act as a senior debugging engineer. Inspect the current code and supplied tests/run output. Prioritize the smallest correct change, preserve existing behavior, and explain the root cause. Return a complete replacement implementation in one fenced Python code block, followed by a concise explanation and the exact tests to rerun. If evidence is insufficient, state assumptions. Never claim you executed the fix." }
};
async function aiRequest(env, user, b, cors) {
  if (env.AI_ENABLED !== "true" || !env.AI_API_URL || !env.AI_API_KEY || !env.AI_MODEL) return json({error:"AI is not configured. The owner must configure an AI provider on the backend."},503,cors);
  if (b.consent !== true) return json({error:"Please confirm the AI data-sharing notice before submitting content."},400,cors);
  const feature = String(b.feature || ""), spec = AI_FEATURES[feature];
  if (!spec) return json({error:"Unknown AI feature."},400,cors);
  const text = String(b.text || ""), code = String(b.code || ""), tests = String(b.tests || "");
  if (text.length > 18000 || code.length > 12000 || tests.length > 4000 || text.length + code.length + tests.length > 34000) return json({error:"Input is too long. Shorten the excerpt or code and try again."},413,cors);
  if ((feature === "summary" || feature === "explain" || feature === "claims") && text.trim().length < 80) return json({error:"Please provide readable paper text first."},400,cors);
  if ((feature === "improve" || feature === "tests" || feature === "fix" || feature === "compatibility") && code.trim().length < 10) return json({error:"Please provide code first."},400,cors);
  const ent = await rows(await db(env,"entitlements?select=plan_id,expires_at&user_id=eq."+q(user.id)));
  const premium = !!(ent[0] && Date.parse(ent[0].expires_at) > Date.now());
  const limit = premium ? 50 : 3;
  const chars = text.length + code.length + tests.length;
  const quota = await rows(await db(env,"rpc/consume_ai_quota",{method:"POST",body:JSON.stringify({p_user:user.id,p_feature:feature,p_limit:limit,p_input_chars:chars})}));
  if (quota !== true && !(Array.isArray(quota) && quota[0] === true)) return json({error:"Monthly AI limit reached. Free accounts get 3 requests per month; Premium accounts get 50."},429,cors);
  const content = (feature === "summary" || feature === "explain") ? text
      : feature === "claims" ? "RESEARCH EXCERPT:\n" + text + "\n\nCODE VERSIONS:\n" + code + "\n\nTESTS AND RUN EVIDENCE:\n" + tests
      : feature === "compatibility" ? code + "\n\nTESTS / CONTEXT:\n" + tests
      : "CODE:\n" + code + (tests ? "\n\nEXISTING TESTS AND RUN EVIDENCE:\n" + tests : "");
  const controller = new AbortController(), timer = setTimeout(()=>controller.abort(),25000);
  try {
    const res = await fetch(env.AI_API_URL,{method:"POST",headers:{"content-type":"application/json","authorization":"Bearer "+env.AI_API_KEY},body:JSON.stringify({model:env.AI_MODEL,temperature:0.2,max_tokens:(feature === "claims" || feature === "compatibility" || feature === "fix") ? 2800 : 1800,messages:[{role:"system",content:spec.system},{role:"user",content:content}] }),signal:controller.signal});
    if(!res.ok) { console.error("AI provider status",res.status); return json({error:res.status===429?"AI provider is busy or rate-limited. Try later.":"AI provider request failed. Check provider configuration."},502,cors); }
    const data=await res.json(), output=data && data.choices && data.choices[0] && data.choices[0].message && data.choices[0].message.content;
    if(typeof output!=="string" || !output.trim()) return json({error:"AI provider returned no usable answer."},502,cors);
    const usedRows=await rows(await db(env,"ai_usage_events?select=id&user_id=eq."+q(user.id)+"&created_at=gte."+q(new Date(new Date().getFullYear(),new Date().getMonth(),1).toISOString())));
    return json({output:output.slice(0,18000),used:usedRows.length,limit,premium},200,cors);
  } finally { clearTimeout(timer); }
}

const PAY_EVENTS = ["payment.captured", "payment.authorized", "payment.failed", "order.paid"];
async function webhook(req, env) {
  if (!testModeReady(env)) return json({ error: "Razorpay TEST mode is not configured." }, 503);
  // Webhooks bypass the signed-in API path, so cap their payload before parsing.
  if (Number(req.headers.get("content-length") || 0) > 65536) return json({ error: "Webhook payload too large." }, 413);
  const raw = await req.text();
  if (enc.encode(raw).byteLength > 65536) return json({ error: "Webhook payload too large." }, 413);
  if (!same(await hmac(env.RAZORPAY_WEBHOOK_SECRET, raw), req.headers.get("x-razorpay-signature"))) return json({ error: "Bad signature." }, 400);
  const id = req.headers.get("x-razorpay-event-id");
  if (!id) return json({ error: "Missing event id." }, 400);
  const fresh = await rows(await db(env, "webhook_events", { method: "POST", headers: { prefer: "resolution=ignore-duplicates,return=representation" }, body: JSON.stringify({ id }) }));
  if (!fresh.length) return json({ ok: true, duplicate: true });
  try {
    const e = JSON.parse(raw), P = e.payload || {}, pay = P.payment && P.payment.entity, ord = P.order && P.order.entity;
    const oid = (pay && pay.order_id) || (ord && ord.id), pid = pay && pay.id;
    if (PAY_EVENTS.includes(e.event) && oid && pid) {
      const status = await confirmPayment(env, oid, pid); // payload is only a hint
      // A captured/paid webhook must not be acknowledged while Razorpay's API
      // still reports the payment as pending; otherwise the event is lost forever.
      if ((e.event === "payment.captured" || e.event === "order.paid") && status === "pending") {
        throw new Error("Razorpay has not confirmed capture yet");
      }
    }
  } catch (err) {  // let Razorpay retry: forget this event id, then fail
    await db(env, "webhook_events?id=eq." + q(id), { method: "DELETE" }); throw err;
  }
  return json({ ok: true });
}
export default {
  async fetch(req, env) {
    const u = new URL(req.url);
    const allowedOrigin = String(env.ALLOWED_ORIGIN || "");
    const requestOrigin = req.headers.get("origin");
    const cors = { "access-control-allow-origin": allowedOrigin || "null", "access-control-allow-headers": "authorization,content-type", "access-control-allow-methods": "GET,POST,OPTIONS", vary: "origin" };
    // Browser API routes are restricted to the configured site origin. Requests
    // without Origin are still allowed for server-to-server calls and tests.
    if (u.pathname !== "/api/webhook" && requestOrigin && requestOrigin !== allowedOrigin) return json({ error: "Origin not allowed." }, 403, { vary: "origin" });
    if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    // Liveness only: do not expose secret presence or imply dependencies are healthy.
    if (u.pathname === "/health" && req.method === "GET") return json({ status: "ok", service: "research-to-code-api" }, 200, cors);
    if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY || !env.SUPABASE_SERVICE_ROLE_KEY) return json({ error: "Backend is not configured yet. The site owner must finish Supabase setup." }, 503, cors);
    if (req.method !== "POST") return json({ error: "Not found." }, 404, cors);
    try {
      if (u.pathname === "/api/webhook") return await webhook(req, env);
      const maxBody = u.pathname === "/api/ai" ? 26000 : 4096;
      if (Number(req.headers.get("content-length") || 0) > maxBody) return json({ error: "Request too large." }, 413, cors);
      const user = await getUser(req, env);
      if (!user) return json({ error: "Please sign in." }, 401, cors);
      const raw = await req.text();
      if (enc.encode(raw).byteLength > maxBody) return json({ error: "Request too large." }, 413, cors);
      let body = {}; try { body = JSON.parse(raw); } catch {}
      if (u.pathname === "/api/ai") return await aiRequest(env, user, body, cors);
      if (u.pathname === "/api/account/export") return await exportAccount(env, user, cors);
      if (u.pathname === "/api/account/delete") return await deleteAccount(env, user, body, cors);
      if (u.pathname === "/api/orders") return await createOrder(env, user, body, cors);
      if (u.pathname === "/api/verify") return await verify(env, user, body, cors);
      return json({ error: "Not found." }, 404, cors);
    } catch (e) { console.error(String(e && e.message)); return json({ error: "Something went wrong. Please try again." }, 500, cors); }
  }
};
