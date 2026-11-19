import { test, expect } from "@playwright/test";
import {
  CAMERA_OPENS_AT,
  CAMERA_CLOSES_AT,
  REVEAL_AT,
  eventStatus,
} from "../../shared/event-window.mjs";

async function prepare(page, epoch = CAMERA_OPENS_AT - 86400000) {
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
  await expect(page.locator("#roll-count")).toHaveText("23 / 24 LEFT");
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

test("24 wedding-day exposures fill and lock a concealed disposable roll", async ({
  page,
}) => {
  await prepare(page, CAMERA_OPENS_AT + 3600000);
  await enter(page);
  await openLiveCamera(page);
  for (let left = 23; left >= 0; left--) {
    await page.getByRole("button", { name: "Take photo", exact: true }).click();
    await expect(page.locator("#roll-count")).toHaveText(
      left ? String(left).padStart(2, "0") + " / 24 LEFT" : "ROLL COMPLETE",
    );
  }
  await expect(
    page.getByRole("button", { name: "Take photo", exact: true }),
  ).toBeDisabled();
  expect(await page.locator("#camera-dialog input[type=file]").count()).toBe(0);
  expect(await page.locator("#preview-roll img").count()).toBe(0);
  expect(await page.locator("#preview-roll button").count()).toBe(0);
  await expect(page.locator(".film-frame.is-exposed")).toHaveCount(24);
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
        photoBottom: document
          .querySelector(".hero-photo")
          .getBoundingClientRect().bottom,
      }));
      expect(result.scroll).toBeLessThanOrEqual(result.client);
      expect(result.fontLoaded).toBe(true);
      if (width <= 390) expect(result.photoBottom).toBeLessThan(height);
      await expect(page.locator("[data-camera-header]")).not.toBeVisible();
      await page.screenshot({
        path: "docs/screenshots/calligraphy-landing-" + width + ".png",
      });
    },
  );
