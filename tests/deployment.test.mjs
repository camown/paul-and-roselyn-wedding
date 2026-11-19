import { test } from "node:test";
import assert from "node:assert/strict";
import { cp, mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { pathToFileURL } from "node:url";

const config = JSON.parse(await readFile("vercel.json", "utf8"));

test("isolated function package serves the event clock and preserves fail-closed RSVP over HTTP", async () => {
  // Outside api/ and shared/, so imports cannot silently resolve from the checkout.
  const artifacts = path.resolve(".test-artifacts");
  await mkdir(artifacts, { recursive: true });
  const bundle = await mkdtemp(path.join(artifacts, "deployment-"));
  let server;
  try {
    assert.equal(config.functions["api/event-status.js"].includeFiles, "shared/**");
    await cp("api", path.join(bundle, "api"), { recursive: true });
    await cp("shared", path.join(bundle, "shared"), { recursive: true });
    const { default: clock } = await import(pathToFileURL(path.join(bundle, "api/event-status.js")));
    const { default: rsvp } = await import(pathToFileURL(path.join(bundle, "api/rsvp.js")));
    server = createServer(async (req, res) => {
      res.status = (code) => { res.statusCode = code; return res; };
      res.json = (body) => { res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); return res; };
      try {
        if (req.url.startsWith("/api/event-status")) await clock(req, res);
        else if (req.url === "/api/rsvp") await rsvp(req, res);
        else { res.statusCode = 404; res.end(); }
      } catch (error) { res.statusCode = 500; res.end(error.message); }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    const base = `http://127.0.0.1:${server.address().port}`;
    const before = Date.now();
    const response = await fetch(base + "/api/event-status?now=2026-12-19");
    assert.equal(response.status, 200);
    assert.match(response.headers.get("content-type"), /application\/json/);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    const body = await response.json();
    assert.ok(body.serverNow >= before && body.serverNow <= Date.now());
    assert.equal(body.opensAt, Date.parse("2026-12-19T00:00:00+08:00"));
    const post = await fetch(base + "/api/event-status", { method: "POST" });
    assert.equal(post.status, 405);
    assert.equal(post.headers.get("allow"), "GET");
    const disabled = await fetch(base + "/api/rsvp", { method: "POST" });
    assert.equal(disabled.status, 503);
    assert.match((await disabled.json()).error, /No reply has been saved/);
    assert.equal((await fetch(base + "/api/missing")).status, 404);
  } finally {
    if (server) await new Promise((resolve) => server.close(resolve));
    await rm(bundle, { recursive: true, force: true });
  }
});

test("production photo manifest points only to existing published content", async () => {
  const manifest = JSON.parse(await readFile("dist/content/photos.json", "utf8"));
  const allowed = new Set(["hero", "story", "gallery1", "gallery2", "gallery3"]);
  for (const [slot, ref] of Object.entries(manifest)) {
    assert.ok(allowed.has(slot));
    assert.match(ref, /^\/content\/[a-zA-Z0-9_-]+\.(?:jpg|png|webp)$/);
    const bytes = await readFile(path.join("dist", ref));
    assert.ok(bytes.length > 0);
  }
});
