import test from "node:test";
import assert from "node:assert/strict";
import { createShortenHandler, createRedirectHandler } from "../lib/handlers.js";
import { createShortCode } from "../lib/short-code.js";
import { authenticate, authenticationRequiredResponse } from "../lib/auth.js";
import { authorize } from "../lib/authorization.js";
import { isSelfUrl } from "../lib/url.js";

const origin = "https://cloud-url-shortener-five.vercel.app";
const post = (body) => new Request(`${origin}/api/shorten`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
});

test("new URL, duplicate reuse and exact response fields", async () => {
  const saved = new Map();
  const handler = createShortenHandler(async (originalUrl) => {
    const reused = saved.has(originalUrl);
    const shortCode = saved.get(originalUrl) || createShortCode(originalUrl);
    saved.set(originalUrl, shortCode);
    return { shortCode, originalUrl, reused };
  });
  const originalUrl = "https://example.com/path?x=1&y=%2F";
  const first = await handler(post({ originalUrl }));
  assert.equal(first.status, 201);
  const a = await first.json();
  assert.match(a.shortCode, /^[A-Za-z0-9]{6}$/);
  assert.equal(a.originalUrl, originalUrl);
  assert.equal(a.shortUrl, `${origin}/${a.shortCode}`);
  const repeat = await handler(post({ originalUrl }));
  assert.equal(repeat.status, 200);
  assert.equal((await repeat.json()).shortCode, a.shortCode);
  assert.equal(saved.size, 1);
});

for (const [label, raw, code] of [
  ["missing", undefined, "MISSING_URL"], ["empty", "", "MISSING_URL"],
  ["whitespace", "   ", "MISSING_URL"], ["malformed", "not-a-url", "INVALID_URL"],
  ["javascript", "javascript:alert(1)", "INVALID_URL"], ["ftp", "ftp://example.com", "INVALID_URL"],
  ["non-string", 42, "INVALID_URL"], ["too long", "https://example.com/" + "a".repeat(2048), "URL_TOO_LONG"],
]) {
  test(`${label} input rejected before DB access`, async () => {
    const handler = createShortenHandler(() => assert.fail("DB must not be used"));
    const response = await handler(post({ originalUrl: raw }));
    assert.equal(response.status, 400);
    assert.equal((await response.json()).error.code, code);
  });
}

test("same hostname is rejected for root, path, http, ports and case", async () => {
  const handler = createShortenHandler(() => assert.fail("DB must not be used"));
  for (const originalUrl of [origin, `${origin}/abc123`, origin.replace("https:", "http:") + "/xyz", `${origin}:8443/path`, origin.toUpperCase() + "/x"]) {
    assert.equal((await handler(post({ originalUrl }))).status, 400);
  }
  assert.equal(isSelfUrl(new URL("https://production.vercel.app/a"), "https://preview.vercel.app", ["production.vercel.app"]), true);
});

test("other vercel hostname is accepted without visiting it", async () => {
  const handler = createShortenHandler(async (originalUrl) => ({ shortCode: "aB3xK9", originalUrl, reused: false }));
  const originalUrl = "https://other-nonexistent.vercel.app/test";
  const response = await handler(post({ originalUrl }));
  assert.equal(response.status, 201);
  assert.equal((await response.json()).originalUrl, originalUrl);
});

test("internal localhost URL uses the incoming Host for self checks and shortUrl", async () => {
  const handler = createShortenHandler(async (originalUrl) => ({ shortCode: "aB3xK9", originalUrl, reused: false }));
  const request = (originalUrl) => new Request("http://localhost:3000/api/shorten", {
    method: "POST", headers: { "Content-Type": "application/json", host: "127.0.0.1:3000" },
    body: JSON.stringify({ originalUrl }),
  });
  assert.equal((await handler(request("http://127.0.0.1:3000/aB3xK9"))).status, 400);
  const response = await handler(request("https://example.com"));
  assert.equal((await response.json()).shortUrl, "http://127.0.0.1:3000/aB3xK9");
});

test("redirect awaits a click update, preserves URL and is never cached", async () => {
  let recorded = false;
  const originalUrl = "https://example.com/path?Case=%2f&x=2";
  const handler = createRedirectHandler(async () => originalUrl, async () => {
    await new Promise((resolve) => setTimeout(resolve, 5)); recorded = true;
  });
  const response = await handler(new Request(`${origin}/aB3xK9`), { params: Promise.resolve({ shortCode: "aB3xK9" }) });
  assert.equal(recorded, true);
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), originalUrl);
  assert.equal(response.headers.get("cache-control"), "no-store");
});

test("click recording failure does not interrupt redirect", async () => {
  const handler = createRedirectHandler(async () => "https://example.com", async () => { throw new Error("simulated DB error"); });
  const response = await handler(null, { params: { shortCode: "aB3xK9" } });
  assert.equal(response.status, 307);
  assert.equal(response.headers.get("location"), "https://example.com");
});

test("unknown and invalid short codes return 404 and do not count clicks", async () => {
  const handler = createRedirectHandler(async () => null, async () => assert.fail("no click"));
  for (const shortCode of ["ABC123", "favicon.ico"]) {
    assert.equal((await handler(null, { params: { shortCode } })).status, 404);
  }
});

test("database failures return a generic error without connection details", async () => {
  const handler = createShortenHandler(async () => { throw new Error("postgresql://hidden:password@host/db"); });
  const response = await handler(post({ originalUrl: "https://example.com" }));
  assert.equal(response.status, 500);
  const text = await response.text();
  assert.equal(text.includes("postgresql"), false);
  assert.equal(JSON.parse(text).error.code, "INTERNAL_ERROR");
});

test("Basic authentication rejects missing, malformed, wrong and unconfigured credentials", () => {
  const originalPassword = process.env.ADMIN_PASSWORD;
  const makeRequest = (value) => new Request(origin, { headers: value ? { authorization: value } : {} });
  const basic = (value) => `Basic ${Buffer.from(value).toString("base64")}`;
  try {
    process.env.ADMIN_PASSWORD = "test-only:password";
    assert.equal(authenticate(makeRequest()), null);
    assert.equal(authenticate(makeRequest("Basic !!!")), null);
    assert.equal(authenticate(makeRequest(basic("admin:wrong"))), null);
    assert.equal(authenticate(makeRequest(basic("other:test-only:password"))), null);
    assert.deepEqual(authenticate(makeRequest(basic("admin:test-only:password"))), { username: "admin", role: "admin" });
    delete process.env.ADMIN_PASSWORD;
    assert.equal(authenticate(makeRequest(basic("admin:"))), null);
    const response = authenticationRequiredResponse();
    assert.equal(response.status, 401);
    assert.match(response.headers.get("www-authenticate"), /Basic/);
    assert.equal(response.headers.get("cache-control"), "no-store");
  } finally {
    if (originalPassword === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = originalPassword;
  }
});

test("authorization grants only listed permissions", () => {
  assert.equal(authorize(null, "stats:read"), false);
  assert.equal(authorize({ role: "admin" }, "stats:read"), true);
  assert.equal(authorize({ role: "admin" }, "not:allowed"), false);
  assert.equal(authorize({ role: "toString" }, "stats:read"), false);
});
