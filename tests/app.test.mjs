import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdtemp, mkdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import handler from "../api/rsvp.js";
import { createServer } from "vite";
import configFactory from "../vite.config.mjs";
const config = configFactory({ mode: "test" });
import { createPreviewArchive } from "../assets/js/export.mjs";
import { unzipSync, strFromU8 } from "fflate";
import { createCalendar } from "../assets/js/calendar.mjs";
import eventStatusHandler from "../api/event-status.js";
import { CAMERA_OPENS_AT, CAMERA_CLOSES_AT } from "../shared/event-window.mjs";

test("event clock is read-only, uncacheable and ignores client-supplied dates", async () => {
  const headers = {};
  let status, body;
  const res = {
    setHeader: (key, value) => {
      headers[key] = value;
    },
    status(code) {
      status = code;
      return this;
    },
    json(value) {
      body = value;
      return this;
    },
  };
  const before = Date.now();
  await eventStatusHandler(
    {
      method: "GET",
      query: { now: "2026-12-19T12:00:00+08:00" },
      body: { serverNow: CAMERA_OPENS_AT },
    },
    res,
  );
  assert.equal(status, 200);
  assert.equal(headers["Cache-Control"], "private, no-store");
  assert.ok(body.serverNow >= before && body.serverNow <= Date.now());
  assert.equal(body.opensAt, CAMERA_OPENS_AT);
  assert.equal(body.closesAt, CAMERA_CLOSES_AT);
  await eventStatusHandler({ method: "POST" }, res);
  assert.equal(status, 405);
  assert.equal(headers.Allow, "GET");
});

test("calendar preserves Philippine event times and valid ICS escaping and line folding", () => {
  const ics = createCalendar(new Date("2026-11-16T00:00:00Z"));
  assert.match(ics, /DTSTART:20261219T010000Z/);
  assert.match(ics, /DTEND:20261219T060000Z/);
  assert.match(ics, /DTSTAMP:20261116T000000Z/);
  assert.ok(ics.split("\r\n").every((line) => line.length <= 75));
  const unfolded = ics.replace(/\r\n /g, "");
  assert.ok(unfolded.includes("Cathedral)\\, Imus\\, Cavite"));
  assert.ok(!unfolded.includes("\\\\,"));
});

test("preview exports recoverable JPEG files and optional reply without changing image data", async () => {
  const bytes = await readFile(
    new URL("../assets/images/story-couple.jpg", import.meta.url),
  );
  const archive = await createPreviewArchive(
    [
      {
        id: "test-id",
        blob: new Blob([bytes]),
        createdAt: "2026-11-16T00:00:00Z",
      },
    ],
    { name: "Preview Guest", attendance: "yes" },
  );
  const files = unzipSync(new Uint8Array(await archive.arrayBuffer()));
  assert.deepEqual(Buffer.from(files["photos/01.jpg"]), bytes);
  const manifest = JSON.parse(strFromU8(files["manifest.json"]));
  assert.equal(manifest.reply.name, "Preview Guest");
  assert.equal(manifest.photos[0].filename, "photos/01.jpg");
  const cameraOnly = unzipSync(
    new Uint8Array(
      await (await createPreviewArchive([], undefined)).arrayBuffer(),
    ),
  );
  assert.equal(
    JSON.parse(strFromU8(cameraOnly["manifest.json"])).reply,
    undefined,
  );
});

test("unconfigured RSVP never exposes records or claims a successful save", async () => {
  for (const method of ["GET", "POST", "PUT", "DELETE"]) {
    const headers = {};
    let status, body;
    const res = {
      setHeader: (key, value) => {
        headers[key] = value;
      },
      status(code) {
        status = code;
        return this;
      },
      json(value) {
        body = value;
      },
    };
    await handler({ method, body: { name: "Private Guest" } }, res);
    assert.equal(status, 503);
    assert.equal(headers["Cache-Control"], "no-store");
    assert.match(body.error, /No reply has been saved/);
    assert.equal(body.rsvps, undefined);
  }
});

test("development photo editor rejects foreign origins, unknown slots and disguised files; valid assets persist", async () => {
  // Isolate editor filesystem operations under D:, and restore cwd before cleanup.
  const root = process.cwd();
  const scratch = await mkdtemp(path.join(root, ".test-artifacts-"));
  const server = await createServer({
    configFile: false,
    root: scratch,
    cacheDir: path.join(scratch, "node_modules/.vite"),
    plugins: config.plugins,
    server: { host: "127.0.0.1", port: 0 },
  });
  try {
    process.chdir(scratch);
    await server.listen();
    const address = server.httpServer.address();
    const base = `http://127.0.0.1:${address.port}/__dev/photos`;
    assert.equal(
      (
        await fetch(`${base}?slot=hero`, {
          method: "PUT",
          headers: { Origin: "https://untrusted.example" },
          body: "bad",
        })
      ).status,
      403,
    );
    assert.equal(
      (
        await fetch(`${base}?slot=../../outside`, {
          method: "PUT",
          body: "bad",
        })
      ).status,
      400,
    );
    assert.equal(
      (
        await fetch(`${base}?slot=hero`, {
          method: "PUT",
          headers: { "Content-Type": "image/jpeg" },
          body: "not an image",
        })
      ).status,
      415,
    );
    const image = await readFile(
      path.join(root, "assets/images/story-couple.jpg"),
    );
    const response = await fetch(`${base}?slot=hero`, {
      method: "PUT",
      body: image,
    });
    assert.equal(response.status, 200);
    assert.equal((await response.json()).hero, "/content/hero.jpg");
    assert.deepEqual(
      await readFile(path.join(scratch, "public/content/hero.jpg")),
      image,
    );
    const saved = await fetch(base);
    assert.equal((await saved.json()).hero, "/content/hero.jpg");
    const reset = await fetch(`${base}?slot=hero`, { method: "DELETE" });
    assert.deepEqual(await reset.json(), {});
    const extraSlots = ["keepsake", "opening-00000000-0000-4000-8000-000000000001", "opening-00000000-0000-4000-8000-000000000002"];
    const writes = await Promise.all(extraSlots.map(slot => fetch(`${base}?slot=${slot}`, { method: "PUT", body: image })));
    assert.ok(writes.every(response => response.status === 200));
    const multiple = await (await fetch(base)).json();
    assert.deepEqual(Object.keys(multiple).sort(), [...extraSlots].sort());
    for (const slot of extraSlots) assert.deepEqual(await readFile(path.join(scratch, "public/content", slot + ".jpg")), image);
    for (const slot of extraSlots) await fetch(`${base}?slot=${slot}`, { method: "DELETE" });
    assert.deepEqual(await (await fetch(base)).json(), {});
    assert.equal(
      (await fetch(`${base}?slot=hero`, { method: "POST" })).status,
      405,
    );
  } finally {
    await server.close();
    process.chdir(root);
    await rm(scratch, { recursive: true, force: true });
  }
});

test("build contains every referenced local asset and excludes development editor behavior", async () => {
  const html = await readFile("dist/index.html", "utf8");
  const refs = [...html.matchAll(/(?:src|href)="(\/assets\/[^"?#]+)"/g)].map(
    (match) => match[1],
  );
  assert.ok(refs.length > 3);
  for (const ref of refs) await readFile(path.join("dist", ref));
  const jsPath = refs.find((ref) => ref.endsWith(".js"));
  const js = await readFile(path.join("dist", jsPath), "utf8");
  assert.ok(!js.includes("/__dev/photos?slot="));
  assert.ok(!js.includes("Saving to project"));
});
