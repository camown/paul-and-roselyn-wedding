import { test } from "node:test";
import assert from "node:assert/strict";
import { indexedDB } from "fake-indexeddb";
import { readFile } from "node:fs/promises";
import {
  FILM_LIMIT,
  FILM_REVEAL_AT,
  filmIsDeveloped,
  recordFilmExposure as recordExposure,
} from "../assets/js/film.mjs";
import {
  CAMERA_OPENS_AT,
  CAMERA_CLOSES_AT,
  cameraPhase,
  eventStatus,
} from "../shared/event-window.mjs";
import { createEventClock } from "../assets/js/event-clock.mjs";
const weddingNoon = Date.parse("2026-12-19T12:00:00+08:00");
const recordFilmExposure = (database, photo) =>
  recordExposure(database, photo, weddingNoon);

test("capture is restricted to the exact Philippine wedding calendar day", () => {
  assert.equal(CAMERA_OPENS_AT, Date.parse("2026-12-18T16:00:00Z"));
  assert.equal(CAMERA_CLOSES_AT, Date.parse("2026-12-19T16:00:00Z"));
  assert.equal(cameraPhase(CAMERA_OPENS_AT - 1), "scheduled");
  assert.equal(cameraPhase(CAMERA_OPENS_AT), "open");
  assert.equal(cameraPhase(CAMERA_CLOSES_AT - 1), "open");
  assert.equal(cameraPhase(CAMERA_CLOSES_AT), "closed");
  assert.equal(cameraPhase(NaN), "unavailable");
});

test("the storage write guard rejects capture before and after the event", async () => {
  const database = await openTestDatabase();
  try {
    await assert.rejects(
      recordExposure(database, frame(), CAMERA_OPENS_AT - 1),
      /only available/,
    );
    await assert.rejects(
      recordExposure(database, frame(), CAMERA_CLOSES_AT),
      /only available/,
    );
    await assert.rejects(
      recordExposure(database, frame(), NaN),
      /only available/,
    );
    assert.equal(await recordExposure(database, frame(), CAMERA_OPENS_AT), 1);
  } finally {
    database.close();
  }
});

test("server clock ignores wall-clock changes and fails closed on stale or invalid state", () => {
  let tick = 100;
  const clock = createEventClock(() => tick);
  assert.ok(Number.isNaN(clock.now()));
  clock.sync(eventStatus(CAMERA_OPENS_AT - 2000));
  tick += 2000;
  assert.equal(clock.now(), CAMERA_OPENS_AT);
  assert.equal(cameraPhase(clock.now()), "open");
  tick += 90001;
  assert.ok(Number.isNaN(clock.now()));
  clock.clear();
  assert.ok(Number.isNaN(clock.now()));
  assert.throws(
    () =>
      clock.sync({ ...eventStatus(), closesAt: CAMERA_CLOSES_AT + 86400000 }),
    /Invalid/,
  );
});
async function openTestDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open("film-" + crypto.randomUUID(), 1);
    request.onupgradeneeded = () => {
      request.result.createObjectStore("photos", { keyPath: "id" });
      request.result.createObjectStore("settings");
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}
const frame = () => ({
  id: crypto.randomUUID(),
  blob: new Blob(["camera frame"], { type: "image/jpeg" }),
  createdAt: new Date().toISOString(),
});
test("a disposable roll keeps an atomic 24-exposure limit during simultaneous captures", async () => {
  const database = await openTestDatabase();
  try {
    const results = await Promise.allSettled(
      Array.from({ length: 30 }, () => recordFilmExposure(database, frame())),
    );
    assert.equal(
      results.filter((r) => r.status === "fulfilled").length,
      FILM_LIMIT,
    );
    assert.equal(results.filter((r) => r.status === "rejected").length, 6);
    await assert.rejects(
      recordFilmExposure(database, frame()),
      /roll is complete/,
    );
  } finally {
    database.close();
  }
});
test("removing a stored object cannot restore its spent exposure", async () => {
  const database = await openTestDatabase();
  try {
    for (let i = 0; i < FILM_LIMIT; i++)
      await recordFilmExposure(database, frame());
    await new Promise((resolve, reject) => {
      const tx = database.transaction("photos", "readwrite");
      tx.objectStore("photos").clear();
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    await assert.rejects(
      recordFilmExposure(database, frame()),
      /roll is complete/,
    );
  } finally {
    database.close();
  }
});
test("the local reveal boundary uses Philippine noon and hides frames until then", () => {
  assert.equal(FILM_REVEAL_AT, Date.parse("2026-12-20T04:00:00Z"));
  assert.equal(filmIsDeveloped(FILM_REVEAL_AT - 1), false);
  assert.equal(filmIsDeveloped(FILM_REVEAL_AT), true);
});
test("a failed save rolls back its exposure credit", async () => {
  const database = await openTestDatabase();
  try {
    const original = frame();
    assert.equal(await recordFilmExposure(database, original), 1);
    await assert.rejects(recordFilmExposure(database, original));
    assert.equal(await recordFilmExposure(database, frame()), 2);
  } finally {
    database.close();
  }
});
test("guest camera contains capture controls without file inputs or shot-deletion controls", async () => {
  const html = await readFile("index.html", "utf8");
  const camera = html.slice(
    html.indexOf('id="camera-dialog"'),
    html.indexOf('<dialog aria-label="Enlarged memory"'),
  );
  assert.ok(camera.includes('id="shutter"'));
  assert.ok(!camera.includes('type="file"'));
  assert.ok(!camera.includes("choose-photo"));
  assert.ok(!camera.includes("camera-file"));
  const js = await readFile("assets/js/main.js", "utf8");
  assert.ok(!js.includes("store.delete(photo.id)"));
  assert.ok(!js.includes("createImageBitmap(file)"));
});
