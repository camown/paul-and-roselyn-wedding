import { test, expect } from "@playwright/test";
import { readFile, writeFile, cp, mkdir, mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { createServer } from "vite";
import configFactory from "../../vite.config.mjs";
import {
  CAMERA_OPENS_AT,
  CAMERA_CLOSES_AT,
  REVEAL_AT,
  eventStatus,
} from "../../shared/event-window.mjs";

async function prepare(page, epoch = CAMERA_OPENS_AT - 86400000) {
  // User-selected local album contents must not change fixture album counts.
  await page.route("**/__dev/photos", route => route.request().method() === "GET" ? route.fulfill({ json: {} }) : route.fallback());
  const clock = { epoch, unavailable: false, malformed: false };
  await page.route("**/api/event-status", (route) =>
    route.fulfill(
      clock.unavailable
        ? { status: 503, body: "Unavailable" }
        : {
            json: clock.malformed
              ? { serverNow: clock.epoch }
              : eventStatus(clock.epoch),
          },
    ),
  );
  await page.addInitScript(() => {
    window.__mediaCalls = 0;
    navigator.mediaDevices.getUserMedia = async () => {
      window.__mediaCalls++;
      const canvas = document.createElement("canvas");
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext("2d");
      ctx.fillStyle = "#8b654d";
      ctx.fillRect(0, 0, 1280, 720);
      const stream = canvas.captureStream(5);
      window.__testStream = stream;
      return stream;
    };
  });
  await page.emulateMedia({ reducedMotion: "reduce" });
  return clock;
}
async function enter(page) {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Open your invitation", exact: true })
    .click();
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
}
async function openLiveCamera(page) {
  await page
    .getByRole("button", { name: "Open guest camera", exact: true })
    .click();
  await expect(page.locator("#camera-dialog")).toBeVisible();
  await page
    .getByRole("button", { name: "Enable camera", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Take photo", exact: true }),
  ).toBeEnabled();
}

test("RSVP delivery confirms only acknowledged replies and retries the same reply ID", async ({ page }) => {
  await prepare(page);
  const submissions = [];
  let fail = true;
  await page.route("**/api/rsvp", async route => {
    if (route.request().method() === "GET") return route.fulfill({ json: { enabled: true } });
    const reply = route.request().postDataJSON(); submissions.push(reply);
    return route.fulfill(fail ? { status: 502, json: { error: "Could not confirm your reply. Please retry." } } : { json: { saved: true, id: reply.id } });
  });
  await enter(page);
  await expect(page.locator("#privacy-storage-notice")).toContainText("private Google spreadsheet");
  await expect(page.locator("#privacy-device-notice")).toContainText("do not delete a reply already received");
  await page.getByLabel("Your name", { exact: true }).fill("Test guest");
  await page.getByLabel("Joyfully accepts", { exact: true }).check();
  await page.getByRole("button", { name: "Send our reply", exact: false }).click();
  await expect(page.locator("#rsvp-status")).toHaveText("Could not confirm your reply. Please retry.");
  expect(await page.locator("#rsvp-status").textContent()).not.toContain("received");
  fail = false;
  await page.getByRole("button", { name: "Send our reply", exact: false }).click();
  await expect(page.locator("#rsvp-status")).toContainText("received by Paul & Roselyn");
  expect(submissions).toHaveLength(2);
  expect(submissions[0].id).toBe(submissions[1].id);
  await page.reload();
  await expect(page.locator("#rsvp-status")).toHaveText("Your reply was received. You can update it below.");
});

test("optional Supabase client reuses its instance without creating a guest account", async ({ page }) => {
  let signups = 0;
  page.on("request", request => { if (request.url().includes("/auth/v1/signup")) signups++; });
  await prepare(page);
  await enter(page);
  const result = await page.evaluate(async () => {
    const { getSupabaseClient } = await import("/assets/js/supabase.mjs");
    const client = getSupabaseClient();
    if (!client) return { configured: false };
    const { data, error } = await client.auth.getSession();
    return { configured: true, singleton: client === getSupabaseClient(), session: data.session, error: error?.message ?? null };
  });
  if (result.configured) {
    expect(result.singleton).toBe(true);
    expect(result.session).toBeNull();
    expect(result.error).toBeNull();
  }
  expect(signups).toBe(0);
});

test("the day before: device-date spoofing cannot expose camera controls or request permission", async ({
  page,
}) => {
  await prepare(page, CAMERA_OPENS_AT - 60000);
  await page.addInitScript(() => {
    Date.now = () => Date.parse("2026-12-19T12:00:00+08:00");
  });
  await enter(page);
  await expect(page.locator("[data-camera-header]")).not.toBeVisible();
  await page
    .getByRole("button", { name: "Camera opens 19 December", exact: true })
    .click();
  await expect(page.locator("#camera-locked-dialog")).toBeVisible();
  await expect(page.locator("#camera-dialog")).not.toBeVisible();
  await expect(page.locator("#camera-unlock-countdown")).toContainText("min");
  expect(await page.evaluate(() => window.__mediaCalls)).toBe(0);
  await page.screenshot({ path: "docs/screenshots/wedding-camera-locked.png" });
});

test("closing midnight blocks camera access", async ({ page }) => {
  await prepare(page, CAMERA_CLOSES_AT);
  await enter(page);
  await page
    .getByRole("button", { name: "The guest camera", exact: true })
    .click();
  await expect(page.locator("#camera-locked-dialog")).toBeVisible();
  await expect(page.locator("#camera-schedule-message")).toContainText(
    "Capture has ended",
  );
  expect(await page.evaluate(() => window.__mediaCalls)).toBe(0);
});

for (const kind of ["unavailable", "malformed"])
  test(
    "clock " + kind + " fails closed without camera permission",
    async ({ page }) => {
      const clock = await prepare(page);
      clock[kind] = true;
      await enter(page);
      await page
        .getByRole("button", { name: "Camera opens 19 December", exact: true })
        .click();
      await expect(page.locator("#camera-locked-dialog")).toBeVisible();
      await expect(
        page.getByRole("button", { name: "Check again", exact: true }),
      ).toBeVisible();
      await expect(page.locator("#camera-dialog")).not.toBeVisible();
      expect(await page.evaluate(() => window.__mediaCalls)).toBe(0);
      clock[kind] = false;
      await page.getByRole("button", { name: "Check again", exact: true }).click();
      await expect(page.locator("#camera-schedule-title")).toHaveText("Your camera awaits.");
      await expect(page.locator("#retry-camera-clock")).not.toBeVisible();
      await page.getByRole("button", { name: "Back to the invitation", exact: true }).click();
      await expect(page.locator("#camera-locked-dialog")).not.toBeVisible();
    },
  );

test("wedding capture works, then a midnight check stops the stream and rejects the next shot", async ({
  page,
}) => {
  const clock = await prepare(page, CAMERA_OPENS_AT + 3600000);
  await enter(page);
  await openLiveCamera(page);
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(page.locator("#roll-count")).toHaveText("11 / 12 LEFT");
  expect(await page.locator("#preview-roll img").count()).toBe(0);
  clock.epoch = CAMERA_CLOSES_AT;
  await page.getByRole("button", { name: "Take photo", exact: true }).click();
  await expect(page.locator("#camera-locked-dialog")).toBeVisible();
  await expect(page.locator("#camera-dialog")).not.toBeVisible();
  expect(
    await page.evaluate(() =>
      window.__testStream
        .getTracks()
        .every((track) => track.readyState === "ended"),
    ),
  ).toBe(true);
  expect(await page.locator(".film-frame.is-exposed").count()).toBe(1);
});

test("12 wedding-day exposures fill and lock a concealed disposable roll", async ({
  page,
}) => {
  await prepare(page, CAMERA_OPENS_AT + 3600000);
  await enter(page);
  await openLiveCamera(page);
  for (let left = 11; left >= 0; left--) {
    await page.getByRole("button", { name: "Take photo", exact: true }).click();
    await expect(page.locator("#roll-count")).toHaveText(
      left ? String(left).padStart(2, "0") + " / 12 LEFT" : "ROLL COMPLETE",
    );
  }
  await expect(
    page.getByRole("button", { name: "Take photo", exact: true }),
  ).toBeDisabled();
  expect(await page.locator("#camera-dialog input[type=file]").count()).toBe(0);
  expect(await page.locator("#preview-roll img").count()).toBe(0);
  expect(await page.locator("#preview-roll button").count()).toBe(0);
  await expect(page.locator(".film-frame.is-exposed")).toHaveCount(12);
});

test("developed photos have a separate viewer after capture closes", async ({
  page,
}) => {
  await prepare(page, REVEAL_AT + 1000);
  await enter(page);
  await page.evaluate(async () => {
    const canvas = document.createElement("canvas");
    canvas.width = 40;
    canvas.height = 40;
    canvas.getContext("2d").fillRect(0, 0, 40, 40);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg"),
    );
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open("pr-wedding-preview", 1);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    await new Promise((resolve, reject) => {
      const tx = db.transaction("photos", "readwrite");
      tx.objectStore("photos").put({
        id: "test-frame",
        blob,
        source: "camera",
        createdAt: "2026-12-19T01:00:00Z",
      });
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });
    db.close();
  });
  await page
    .getByRole("button", { name: "The guest camera", exact: true })
    .click();
  await page
    .getByRole("button", { name: "View your developed film", exact: false })
    .click();
  await expect(page.locator("#film-dialog")).toBeVisible();
  await expect(page.locator("#developed-film img")).toHaveCount(1);
  await expect(page.locator("#camera-dialog")).not.toBeVisible();
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download your roll", exact: true }).click();
  expect((await download).suggestedFilename()).toMatch(/\.zip$/);
  await page.getByRole("button", { name: "Close developed film", exact: true }).click();
  await expect(page.locator("#film-dialog")).not.toBeVisible();
});

test("opening, replay and mobile navigation work by keyboard and touch", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await page.goto("/");
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: "docs/screenshots/calligraphy-envelope-390.png" });
  await page.getByRole("button", { name: "Open your invitation", exact: true }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
  await expect(page.locator(".hero h1")).toBeFocused();
  await page.locator("#menu-toggle").click();
  await expect(page.locator("#mobile-nav")).toBeVisible();
  await page.locator('#mobile-nav a[href="#attire"]').click();
  await expect(page.locator("#mobile-nav")).not.toBeVisible();
  await expect(page).toHaveURL(/#attire$/);
  await page.locator("#replay-invitation").click();
  await expect(page.locator("#invitation-gate")).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await page.reload();
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
});

test("restyled invitation controls remain usable on a phone", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await prepare(page);
  await enter(page);
  const calendar = page.waitForEvent("download");
  await page.locator("#calendar-button").click();
  expect((await calendar).suggestedFilename()).toMatch(/\.ics$/);
  await page.getByRole("button", { name: "Enlarge our first memory", exact: true }).click();
  await expect(page.locator("#photo-dialog")).toBeVisible();
  await page.getByRole("button", { name: "Close enlarged photo", exact: true }).click();
  for (const summary of await page.locator(".questions summary").all()) {
    await summary.click();
    await expect(summary.locator("..")).toHaveAttribute("open", "");
    await summary.click();
  }
  await page.getByLabel("Your name", { exact: true }).fill("Test Guest");
  await page.getByLabel("Joyfully accepts", { exact: true }).check();
  await page.getByLabel("Seats in your invitation", { exact: true }).selectOption("2");
  await page.getByRole("button", { name: "Save preview reply", exact: true }).click();
  await expect(page.locator("#rsvp-status")).toContainText("2 guests is saved on this device only");
  await page.getByLabel("Regretfully declines", { exact: true }).check();
  await expect(page.locator("#attending-fields")).not.toBeVisible();
  await page.getByRole("button", { name: "Update preview reply", exact: true }).click();
  await expect(page.locator("#rsvp-status")).toContainText("decline is saved on this device only");
  await page.reload();
  await expect(page.getByLabel("Your name", { exact: true })).toHaveValue("Test Guest");
  await expect(page.getByLabel("Regretfully declines", { exact: true })).toBeChecked();
});

for (const width of [390, 1440]) test("opening photos support gallery arrows, keys and swipe at " + width + "px", async ({ page }) => {
  await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
  await prepare(page);
  await enter(page);
  const cover = page.getByRole("button", { name: "Open the opening photo gallery", exact: true });
  await page.getByRole("button", { name: "Next opening photograph", exact: true }).click();
  await expect(page.locator(".hero-photo > img")).toHaveAttribute("data-photo", "keepsake");
  await page.getByRole("button", { name: "Previous opening photograph", exact: true }).click();
  await expect(page.locator(".hero-photo > img")).toHaveAttribute("data-photo", "hero");
  expect(await page.locator(".photo-open-icon, .expand-icon").count()).toBe(0);
  await cover.dispatchEvent("pointerdown", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 270, clientY: 230 });
  await cover.dispatchEvent("pointerup", { pointerId: 7, pointerType: "touch", isPrimary: true, clientX: 100, clientY: 235 });
  await expect(page.locator(".hero-photo > img")).toHaveAttribute("data-photo", "keepsake");
  await cover.dispatchEvent("click", { detail: 1 });
  await expect(page.locator("#photo-dialog")).not.toBeVisible();
  await page.getByRole("button", { name: "Previous opening photograph", exact: true }).click();
  await cover.press("Enter");
  await expect(page.locator("#photo-dialog")).toBeVisible();
  await expect(page.locator("#photo-position")).toContainText("Opening photographs · 1 / 2");
  await page.getByRole("button", { name: "Previous photograph", exact: true }).click();
  await expect(page.locator("#photo-position")).toContainText("2 / 2");
  await page.getByRole("button", { name: "Next photograph", exact: true }).click();
  await expect(page.locator("#photo-position")).toContainText("1 / 2");
  await page.keyboard.press("ArrowRight");
  await expect(page.locator("#photo-position")).toContainText("2 / 2");
  const stage = page.locator(".photo-stage");
  await stage.dispatchEvent("pointerdown", { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 270, clientY: 230 });
  await stage.dispatchEvent("pointerup", { pointerId: 1, pointerType: "touch", isPrimary: true, clientX: 100, clientY: 235 });
  await expect(page.locator("#photo-position")).toContainText("1 / 2");
  await stage.dispatchEvent("pointerdown", { pointerId: 2, pointerType: "touch", isPrimary: true, clientX: 200, clientY: 230 });
  await stage.dispatchEvent("pointerup", { pointerId: 2, pointerType: "touch", isPrimary: true, clientX: 195, clientY: 400 });
  await expect(page.locator("#photo-position")).toContainText("1 / 2");
  const bounds = await page.locator("#photo-dialog").boundingBox();
  expect(bounds.x).toBeGreaterThanOrEqual(0);
  expect(bounds.x + bounds.width).toBeLessThanOrEqual(width);
  await page.screenshot({ path: "docs/screenshots/gallery-viewer-" + width + ".jpg", quality: 85 });
  await page.keyboard.press("Escape");
  await expect(cover).toBeFocused();
  await page.getByRole("button", { name: "Enlarge the small opening photograph", exact: true }).click();
  await expect(page.locator("#photo-position")).toContainText("2 / 2");
  await page.getByRole("button", { name: "Close enlarged photo", exact: true }).click();
  await expect(page.locator("#photo-dialog")).not.toBeVisible();
});

test("local photo shortcut opens separate opening and memory settings", async ({ page }) => {
  await prepare(page);
  await page.goto("/?photos=edit");
  await expect(page.locator("#dev-dialog")).toBeVisible();
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
  await expect(page.locator("#opening-photo-settings input[type=file]")).toHaveCount(2);
  await expect(page.locator("#photo-settings input[type=file]")).toHaveCount(4);
  await page.screenshot({ path: "docs/screenshots/local-photo-settings.jpg", quality: 85 });
  await page.getByRole("button", { name: "Close photo settings", exact: true }).click();
  await expect(page.locator("#dev-button")).toBeVisible();
  await page.locator("#dev-button").click();
  await expect(page.locator("#dev-dialog")).toBeVisible();
});

test("adding and removing opening photos stays separate from Memories", async ({ page }) => {
  await prepare(page);
  const image = await readFile("assets/images/story-couple.jpg");
  const saved = {};
  await page.route("**/__dev/photos*", async route => {
    const slot = new URL(route.request().url()).searchParams.get("slot");
    if (route.request().method() === "PUT") saved[slot] = `/__test-opening-${slot}.jpg`;
    if (route.request().method() === "DELETE") delete saved[slot];
    await route.fulfill({ json: saved });
  });
  await page.route("**/__test-opening-*.jpg*", route => route.fulfill({ contentType: "image/jpeg", body: image }));
  await page.goto("/?photos=edit");
  const chooser = page.waitForEvent("filechooser");
  await page.getByRole("button", { name: "Add opening photos", exact: true }).click();
  await (await chooser).setFiles([
    { name: "opening-a.jpg", mimeType: "image/jpeg", buffer: image },
    { name: "opening-b.jpg", mimeType: "image/jpeg", buffer: image },
  ]);
  await expect(page.locator("#editor-status")).toHaveText("2 opening photographs saved to the project.");
  await expect(page.locator("#opening-photo-settings .editor-slot")).toHaveCount(4);
  await page.getByRole("button", { name: "Close photo settings", exact: true }).click();
  await page.getByRole("button", { name: "Open the opening photo gallery", exact: true }).click();
  await expect(page.locator("#photo-position")).toContainText("Opening photographs · 4 / 4");
  await page.getByRole("button", { name: "Close enlarged photo", exact: true }).click();
  await page.getByRole("button", { name: "Enlarge our first memory", exact: true }).click();
  await expect(page.locator("#photo-position")).toContainText("Memories · 1 / 3");
  await page.getByRole("button", { name: "Close enlarged photo", exact: true }).click();
  await page.locator("#dev-button").click();
  await page.getByRole("button", { name: "Remove opening photo 1 from gallery", exact: true }).click();
  await expect(page.locator("#opening-photo-settings .editor-slot")).toHaveCount(3);
  expect(Object.keys(saved)).toHaveLength(1);
});

test("real multi-photo uploads persist in an isolated local project without reloading the editor", async ({ page }) => {
  test.setTimeout(60000);
  const artifacts = path.resolve(".test-artifacts");
  await mkdir(artifacts, { recursive: true });
  const fixture = await mkdtemp(path.join(artifacts, "photo-editor-"));
  let server;
  try {
    await Promise.all(["index.html", "assets", "shared", "package.json"].map(name => cp(name, path.join(fixture, name), { recursive: true })));
    const config = configFactory({ mode: "test" });
    // The fixture lives under the parent's artifact folder. Allow its source to
    // be watched while preserving the real public/content exclusion under test.
    const watch = { ignored: config.server.watch.ignored.filter(pattern => pattern !== "**/.test-artifacts/**") };
    server = await createServer({ configFile: false, root: fixture, plugins: config.plugins, cacheDir: path.join(fixture, ".vite-cache"), server: { host: "127.0.0.1", port: 0, watch } });
    await server.listen();
    const base = `http://127.0.0.1:${server.httpServer.address().port}`;
    await page.goto(base + "/?photos=edit");
    await expect(page.locator("#dev-dialog")).toBeVisible();
    let reloads = 0;
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) reloads++; });
    const image = await readFile("assets/images/story-couple.jpg");
    const picker = page.waitForEvent("filechooser");
    await page.getByRole("button", { name: "Add opening photos", exact: true }).click();
    await (await picker).setFiles([
      { name: "real-a.jpg", mimeType: "image/jpeg", buffer: image },
      { name: "real-b.jpg", mimeType: "image/jpeg", buffer: image },
    ]);
    await expect(page.locator("#editor-status")).toHaveText("2 opening photographs saved to the project.");
    // Allow a file-watcher reload debounce to elapse; the editor must stay open.
    await page.waitForTimeout(350);
    expect(reloads).toBe(0);
    const manifest = JSON.parse(await readFile(path.join(fixture, "public/content/photos.json"), "utf8"));
    expect(Object.keys(manifest)).toHaveLength(2);
    for (const ref of Object.values(manifest)) expect(await readFile(path.join(fixture, "public", ref))).toEqual(image);
    await mkdir(path.join(fixture, "pictures"));
    await writeFile(path.join(fixture, "pictures", "choice.jpg"), image);
    await page.getByRole("button", { name: "Choose cover photograph from pictures folder", exact: true }).click();
    await expect(page.getByRole("dialog", { name: "Choose from pictures folder" })).toBeVisible();
    await page.getByRole("button", { name: "Select picture 1", exact: true }).click();
    await page.getByRole("button", { name: "Use selected photographs", exact: true }).click();
    await expect(page.locator("#editor-status")).toHaveText("Photograph replaced and saved in the project.");
    const updated = JSON.parse(await readFile(path.join(fixture, "public/content/photos.json"), "utf8"));
    expect(await readFile(path.join(fixture, "public", updated.hero))).toEqual(image);
    expect((await page.request.get(base + "/__dev/library?file=..%2Findex.html")).status()).toBe(404);
    expect((await page.request.get(base + "/__dev/library", { headers: { Origin: "https://other.example" } })).status()).toBe(403);
    await page.reload();
    await expect(page.locator("#opening-photo-settings .editor-slot")).toHaveCount(4);
    await page.getByRole("button", { name: "Close photo settings", exact: true }).click();
    await page.getByRole("button", { name: "Open the opening photo gallery", exact: true }).click();
    await expect(page.locator("#photo-position")).toContainText("1 / 4");
  } finally {
    if (server) await server.close();
    if (!fixture.startsWith(artifacts + path.sep)) throw new Error("Unexpected test fixture path");
    await rm(fixture, { recursive: true, force: true });
  }
});

for (const width of [320, 390, 768, 1366, 1440]) test("first visit and replay land on the centered invitation at " + width + "px", async ({ page }) => {
  const height = width === 320 ? 720 : width === 390 ? 844 : width === 1366 ? 768 : 1000;
  await page.setViewportSize({ width, height });
  await prepare(page);
  await page.goto("/#rsvp");
  await page.evaluate(() => document.fonts.ready);
  const card = await page.locator(".invitation-opening").boundingBox();
  const viewportWidth = await page.evaluate(() => document.documentElement.clientWidth);
  expect(Math.abs(card.x + card.width / 2 - viewportWidth / 2)).toBeLessThan(4);
  expect(card.y).toBeGreaterThanOrEqual(0);
  expect(card.y + card.height).toBeLessThanOrEqual(height + 1);
  await page.getByRole("button", { name: "Open your invitation", exact: true }).click();
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
  await expect(page.locator(".hero h1")).toBeFocused();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
  await expect(page.getByRole("link", { name: "Celebrate with us", exact: false })).toBeInViewport();
  await page.getByRole("link", { name: "Celebrate with us", exact: false }).click();
  await expect(page).toHaveURL(/#rsvp$/);
  await page.locator("#replay-invitation").click();
  await expect(page.locator("#invitation-gate")).toBeVisible();
  await page.getByRole("button", { name: "Open your invitation", exact: true }).click();
  await expect(page.locator("#invitation-gate")).not.toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(0);
});

for (const [width, height] of [
  [320, 720],
  [390, 844],
  [768, 1024],
  [1440, 1000],
])
  test(
    "calligraphic landing and header fit " + width + "px",
    async ({ page }) => {
      await page.setViewportSize({ width, height });
      await prepare(page);
      await enter(page);
      await page.evaluate(() => document.fonts.ready);
      const result = await page.evaluate(() => ({
        client: document.documentElement.clientWidth,
        scroll: document.documentElement.scrollWidth,
        fontLoaded: document.fonts.check("80px Italianno"),
        serifLoaded: document.fonts.check('40px "Bodoni Moda"'),
        serifFamily: getComputedStyle(document.querySelector(".story h2")).fontFamily,
        sectionsFit: [...document.querySelectorAll("main > section")].every(section => section.scrollWidth <= section.clientWidth),
        photoBottom: document
          .querySelector(".hero-photo")
          .getBoundingClientRect().bottom,
      }));
      expect(result.scroll).toBeLessThanOrEqual(result.client);
      expect(result.fontLoaded).toBe(true);
      expect(result.serifLoaded).toBe(true);
      expect(result.serifFamily).toContain("Bodoni Moda");
      expect(result.sectionsFit).toBe(true);
      if (width <= 390) expect(result.photoBottom).toBeLessThan(height);
      await expect(page.locator("[data-camera-header]")).not.toBeVisible();
      await page.screenshot({
        path: "docs/screenshots/calligraphy-landing-" + width + ".png",
      });
      if (width === 390 || width === 1440) {
        for (const id of ["story", "details", "attire", "memories", "rsvp"]) {
          await page.locator("#" + id).scrollIntoViewIfNeeded();
          await page.screenshot({ path: "docs/screenshots/suite-" + id + "-" + width + ".jpg", quality: 85 });
        }
        await page.screenshot({ path: "docs/screenshots/suite-full-" + width + ".jpg", fullPage: true, quality: 80 });
        await expect.poll(() => page.locator("main img").evaluateAll(images => images.every(img => img.complete && img.naturalWidth > 0))).toBe(true);
      }
    },
  );
