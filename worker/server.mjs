import { createServer } from "node:http";
import worker from "./worker.js";

const PORT = Number(process.env.PORT || 8787);
const MAX_BODY_BYTES = 70 * 1024;
const env = Object.fromEntries(Object.entries(process.env).filter(([, value]) => value !== undefined));

function send(res, status, body, headers = {}) {
  res.writeHead(status, { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff", "x-frame-options": "DENY", "content-security-policy": "default-src 'none'; frame-ancestors 'none'", "referrer-policy": "no-referrer", "strict-transport-security": "max-age=31536000", ...headers });
  res.end(JSON.stringify(body));
}

const server = createServer(async (incoming, outgoing) => {
  try {
    const chunks = [];
    let size = 0;
    let tooLarge = false;
    for await (const chunk of incoming) {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        tooLarge = true;
        chunks.length = 0;
        continue;
      }
      if (!tooLarge) chunks.push(chunk);
    }
    if (tooLarge) {
      send(outgoing, 413, { error: "Request too large." });
      return;
    }
    const headers = new Headers();
    for (const [key, value] of Object.entries(incoming.headers)) {
      if (Array.isArray(value)) for (const item of value) headers.append(key, item);
      else if (value !== undefined) headers.set(key, value);
    }
    const method = incoming.method || "GET";
    const init = { method, headers };
    if (method !== "GET" && method !== "HEAD" && size > 0) init.body = Buffer.concat(chunks);
    const request = new Request("http://render-internal" + (incoming.url || "/"), init);
    const response = await worker.fetch(request, env);
    const responseHeaders = {
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
      "content-security-policy": "default-src 'none'; frame-ancestors 'none'",
      "referrer-policy": "no-referrer",
      "strict-transport-security": "max-age=31536000"
    };
    response.headers.forEach((value, key) => { responseHeaders[key] = value; });
    outgoing.writeHead(response.status, responseHeaders);
    outgoing.end(Buffer.from(await response.arrayBuffer()));
  } catch (error) {
    console.error("API request failed:", error?.name || "Error");
    if (!outgoing.headersSent) send(outgoing, 500, { error: "Something went wrong. Please try again." });
    else outgoing.end();
  }
});

server.listen(PORT, "0.0.0.0", () => console.log("Research to Code API listening on port " + PORT));
