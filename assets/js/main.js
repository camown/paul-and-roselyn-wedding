import {
  CAMERA_OPENS_AT,
  CAMERA_CLOSES_AT,
  REVEAL_AT,
  cameraPhase,
} from "../../shared/event-window.mjs";
import { createEventClock } from "./event-clock.mjs";
import { FILM_LIMIT, filmIsDeveloped, recordFilmExposure } from "./film.mjs";
import { createCalendar } from "./calendar.mjs";
import { createPreviewArchive } from "./export.mjs";
const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
const paths = {
  camera:
    '<rect x="3" y="6" width="18" height="14" rx="2"/><path d="m8 6 2-3h4l2 3"/><circle cx="12" cy="13" r="4"/>',
  menu: '<path d="M5 9h14M5 15h14"/>',
  close: '<path d="m6 6 12 12M6 18 18 6"/>',
  arrow: '<path d="M5 19 19 5M5 5h14v14"/>',
  calendar:
    '<rect x="4" y="5" width="16" height="16" rx="1"/><path d="M8 2v6M16 2v6M4 11h16"/>',
  pin: '<path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 0 1 14 0Z"/><circle cx="12" cy="10" r="2"/>',
  expand: '<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/>',
  image:
    '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8" cy="8" r="1.5"/><path d="m3 17 5-5 4 4 4-6 5 7"/>',
  flip: '<path d="M20 7h-5V2M4 17h5v5M20 7a9 9 0 0 0-15-1M4 17a9 9 0 0 0 15 1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  settings:
    '<path d="m9 3-1 3-3 1 1 3-2 2 2 2-1 3 3 1 1 3h6l1-3 3-1-1-3 2-2-2-2 1-3-3-1-1-3Z"/><circle cx="12" cy="12" r="3"/>',
  reset: '<path d="M3 4v6h6M4 10a8 8 0 1 1 0 5"/>',
  trash: '<path d="M3 6h18M9 6V3h6v3M5 6l1 15h12l1-15M10 10v7M14 10v7"/>',
};
function icon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">${paths[name] || paths.camera}</svg>`;
}
$$("[data-icon]").forEach((element) => {
  element.innerHTML = icon(element.dataset.icon);
});
let toastTimeout;
function toast(message) {
  $("#toast").textContent = message;
  $("#toast").classList.add("visible");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(
    () => $("#toast").classList.remove("visible"),
    3800,
  );
}
let database;
function db() {
  if (!database)
    database = new Promise((resolve, reject) => {
      const request = indexedDB.open("pr-wedding-preview", 1);
      request.onupgradeneeded = () => {
        const store = request.result;
        store.createObjectStore("photos", { keyPath: "id" });
        store.createObjectStore("settings");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () =>
        reject(
          new Error(
            "Device storage is unavailable. Please allow browser storage and retry.",
          ),
        );
    });
  return database;
}
async function storeAction(storeName, mode, action) {
  const database = await db();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(storeName, mode);
    let request;
    try {
      request = action(transaction.objectStore(storeName));
    } catch (error) {
      reject(error);
      return;
    }
    transaction.oncomplete = () => resolve(request?.result);
    transaction.onerror = () =>
      reject(new Error("Could not save on this device. Storage may be full."));
    transaction.onabort = () =>
      reject(new Error("Device storage was interrupted. Please retry."));
  });
}
const getPhotos = () =>
  storeAction("photos", "readonly", (store) => store.getAll());
const getReply = () =>
  storeAction("settings", "readonly", (store) => store.get("reply"));
const defaults = {
  hero: "/assets/images/story-couple.jpg",
  story: "/assets/images/gallery-photo-2.jpg",
  gallery1: "/assets/images/gallery-photo-1.jpg",
  gallery2: "/assets/images/gallery-photo-2.jpg",
  gallery3: "/assets/images/gallery-photo-3.jpg",
};
// URL assets are explicit imports so Vite copies and hashes every default photograph.
const photoSources = {
  hero: new URL("../images/story-couple.jpg", import.meta.url).href,
  story: new URL("../images/gallery-photo-2.jpg", import.meta.url).href,
  gallery1: new URL("../images/gallery-photo-1.jpg", import.meta.url).href,
  gallery2: new URL("../images/gallery-photo-2.jpg", import.meta.url).href,
  gallery3: new URL("../images/gallery-photo-3.jpg", import.meta.url).href,
};
let customPhotos = {};
function applyPhotos() {
  $$("[data-photo]").forEach((img) => {
    const source =
      customPhotos[img.dataset.photo] || photoSources[img.dataset.photo];
    img.src = source;
    img.onerror = () => {
      img.onerror = null;
      img.src = photoSources[img.dataset.photo];
    };
  });
}
async function loadPhotos() {
  try {
    const response = await fetch(
      import.meta.env.DEV ? "/__dev/photos" : "/content/photos.json",
    );
    if (
      response.ok &&
      response.headers.get("content-type")?.includes("application/json")
    )
      customPhotos = await response.json();
  } catch {
    /* The shipped defaults remain available without a manifest. */
  }
  applyPhotos();
}
loadPhotos();
$("#menu-toggle").addEventListener("click", () => {
  const expanded = $("#menu-toggle").getAttribute("aria-expanded") === "true";
  $("#menu-toggle").setAttribute("aria-expanded", String(!expanded));
  $("#mobile-nav").hidden = expanded;
  $("#menu-toggle").innerHTML = icon(expanded ? "menu" : "close");
});
$$("#mobile-nav a").forEach((link) =>
  link.addEventListener("click", closeMenu),
);
function closeMenu() {
  $("#mobile-nav").hidden = true;
  $("#menu-toggle").setAttribute("aria-expanded", "false");
  $("#menu-toggle").innerHTML = icon("menu");
}
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") closeMenu();
});
const dialogFocus = new WeakMap();
async function openDialog(id) {
  if (id === "camera-dialog") {
    const phase = await refreshCameraAccess();
    if (phase !== "open") id = "camera-locked-dialog";
  }
  if (id === "film-dialog") {
    await refreshCameraAccess();
    if (!filmIsDeveloped(cameraClockNow())) id = "camera-locked-dialog";
  }
  const dialog = document.getElementById(id);
  dialogFocus.set(dialog, document.activeElement);
  if (!dialog.open) dialog.showModal();
  if (id === "film-dialog") await renderDevelopedFilm();
  if (id === "camera-dialog") {
    try {
      await renderRoll();
    } catch (error) {
      $("#camera-error").textContent = error.message;
    }
  }
}
$$("[data-open]").forEach((button) =>
  button.addEventListener("click", () => openDialog(button.dataset.open)),
);
$$("dialog").forEach((dialog) => {
  $$("[data-close]", dialog).forEach((button) =>
    button.addEventListener("click", () => dialog.close()),
  );
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) {
      const bounds = dialog.getBoundingClientRect();
      if (
        event.clientX < bounds.left ||
        event.clientX > bounds.right ||
        event.clientY < bounds.top ||
        event.clientY > bounds.bottom
      )
        dialog.close();
    }
  });
  dialog.addEventListener("close", () => {
    if (dialog.id === "camera-dialog") stopCamera();
    dialogFocus.get(dialog)?.focus();
  });
});
const invitationGate = $("#invitation-gate");
let invitationOpening = false;
let invitationTimers = [];
function showInvitationEnvelope() {
  invitationTimers.forEach(clearTimeout);
  invitationTimers = [];
  invitationOpening = false;
  invitationGate.classList.remove("is-opening", "is-revealing");
  $("#open-invitation").disabled = false;
  openDialog("invitation-gate");
}
$("#open-invitation").addEventListener("click", () => {
  if (invitationOpening) return;
  invitationOpening = true;
  $("#open-invitation").disabled = true;
  invitationGate.classList.add("is-opening");
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  invitationTimers.push(
    setTimeout(
      () => invitationGate.classList.add("is-revealing"),
      reducedMotion ? 0 : 800,
    ),
  );
  invitationTimers.push(
    setTimeout(
      () => {
        if (invitationGate.open) invitationGate.close();
      },
      reducedMotion ? 0 : 1350,
    ),
  );
});
invitationGate.addEventListener("close", () => {
  invitationTimers.forEach(clearTimeout);
  invitationTimers = [];
  try {
    sessionStorage.setItem("pr-invitation-opened", "yes");
  } catch {}
  $(".hero h1").focus({ preventScroll: true });
  window.scrollTo({ top: 0, behavior: "instant" });
});
$("#replay-invitation").addEventListener("click", showInvitationEnvelope);
let invitationAlreadyOpened = false;
try {
  invitationAlreadyOpened =
    sessionStorage.getItem("pr-invitation-opened") === "yes";
} catch {}
if (!invitationAlreadyOpened) showInvitationEnvelope();
function requestConfirmation(message) {
  const dialog = $("#confirm-dialog");
  $("#confirm-message").textContent = message;
  dialog.returnValue = "";
  return new Promise((resolve) => {
    dialog.addEventListener(
      "close",
      () => resolve(dialog.returnValue === "confirm"),
      { once: true },
    );
    openDialog("confirm-dialog");
  });
}
$("#confirm-delete").addEventListener("click", () =>
  $("#confirm-dialog").close("confirm"),
);
$$("[data-lightbox]").forEach((button) =>
  button.addEventListener("click", () => {
    $("#enlarged-photo").src = $(
      `[data-photo="${button.dataset.lightbox}"]`,
    ).src;
    $("#enlarged-photo").alt = $("img", button).alt;
    openDialog("photo-dialog");
  }),
);
$$("[data-color]").forEach((button) =>
  button.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(button.dataset.color);
      toast(
        `${button.textContent.trim().split("#")[0]} copied · ${button.dataset.color}`,
      );
    } catch {
      toast(`Color: ${button.dataset.color}`);
    }
  }),
);
function download(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$("#calendar-button").addEventListener("click", () => {
  const ics = createCalendar();
  download(
    new Blob([ics], { type: "text/calendar;charset=utf-8" }),
    "Paul-and-Roselyn.ics",
  );
  toast("Calendar invitation downloaded.");
});
function countdown() {
  const diff = Math.max(
    0,
    new Date("2026-12-19T09:00:00+08:00").getTime() - Date.now(),
  );
  $("#days").textContent = String(Math.floor(diff / 86400000)).padStart(2, "0");
  $("#hours").textContent = String(Math.floor(diff / 3600000) % 24).padStart(
    2,
    "0",
  );
  $("#minutes").textContent = String(Math.floor(diff / 60000) % 60).padStart(
    2,
    "0",
  );
}
countdown();
setInterval(countdown, 30000);
const form = $("#rsvp-form");
function attendanceChanged() {
  const declined = form.elements.attendance.value === "no";
  $("#attending-fields").hidden = declined;
  $("#guest-count").disabled = declined;
  $("#dietary").disabled = declined;
}
$$('[name="attendance"]').forEach((input) =>
  input.addEventListener("change", attendanceChanged),
);
async function loadReply() {
  try {
    const reply = await getReply();
    if (!reply) return;
    form.elements.name.value = reply.name;
    form.elements.attendance.value = reply.attendance;
    form.elements.seats.value = String(reply.seats || 1);
    form.elements.dietary.value = reply.dietary;
    form.elements.message.value = reply.message;
    attendanceChanged();
    $("#rsvp-status").textContent =
      "Your preview reply is saved on this device. You can update it below.";
    $('button[type="submit"]', form).firstChild.textContent =
      "Update preview reply ";
  } catch (error) {
    $("#rsvp-status").textContent = error.message;
  }
}
loadReply();
form.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submit = $('button[type="submit"]', form);
  submit.disabled = true;
  try {
    const data = new FormData(form);
    const name = String(data.get("name") || "").trim();
    if (!name) {
      $("#guest-name").setCustomValidity("Please enter your name.");
      $("#guest-name").reportValidity();
      return;
    }
    const reply = {
      name,
      attendance: data.get("attendance"),
      seats: data.get("attendance") === "no" ? 0 : Number(data.get("seats")),
      dietary: String(data.get("dietary") || "").trim(),
      message: String(data.get("message") || "").trim(),
      updatedAt: new Date().toISOString(),
    };
    await storeAction("settings", "readwrite", (store) =>
      store.put(reply, "reply"),
    );
    $("#rsvp-status").textContent =
      reply.attendance === "yes"
        ? `Thank you, ${name}. Your preview reply for ${reply.seats} guest${reply.seats === 1 ? "" : "s"} is saved on this device only.`
        : `Thank you, ${name}. Your decline is saved on this device only.`;
    submit.firstChild.textContent = "Update preview reply ";
    toast("Preview reply saved on this device.");
  } catch (error) {
    $("#rsvp-status").textContent = error.message;
  } finally {
    submit.disabled = false;
  }
});
$("#guest-name").addEventListener("input", () =>
  $("#guest-name").setCustomValidity(""),
);
let stream = null,
  facing = "environment",
  cameraGeneration = 0,
  photoBusy = false;
const video = $("#camera-video");
function stopCamera() {
  cameraGeneration++;
  stream?.getTracks().forEach((track) => track.stop());
  stream = null;
  video.srcObject = null;
  video.hidden = true;
  $("#camera-placeholder").hidden = false;
  $("#shutter").disabled = true;
  $("#flip-camera").disabled = true;
  $("#enable-camera").disabled = false;
}
async function startCamera() {
  stopCamera();
  const generation = cameraGeneration;
  $("#camera-error").textContent = "";
  $("#enable-camera").disabled = true;
  try {
    if ((await refreshCameraAccess()) !== "open") {
      await openDialog("camera-locked-dialog");
      return;
    }
    if (!navigator.mediaDevices?.getUserMedia)
      throw new Error(
        "Camera access needs HTTPS or localhost. Please open your invitation in Safari or Chrome.",
      );
    let timedOut = false,
      timer;
    const request = navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: facing },
        width: { ideal: 1920 },
        height: { ideal: 1440 },
      },
      audio: false,
    });
    request.then(
      (result) => {
        if (timedOut || generation !== cameraGeneration)
          result.getTracks().forEach((track) => track.stop());
      },
      () => {},
    );
    const timeout = new Promise((_, reject) => {
      timer = setTimeout(() => {
        timedOut = true;
        reject(
          new Error(
            "Camera access is still waiting. Check your browser permission prompt, then try again.",
          ),
        );
      }, 12000);
    });
    let nextStream;
    try {
      nextStream = await Promise.race([request, timeout]);
    } finally {
      clearTimeout(timer);
    }
    if (
      generation !== cameraGeneration ||
      !$("#camera-dialog").open ||
      cameraPhase(cameraClockNow()) !== "open"
    ) {
      nextStream.getTracks().forEach((track) => track.stop());
      return;
    }
    stream = nextStream;
    video.srcObject = stream;
    video.dataset.facing = facing;
    video.hidden = false;
    await video.play();
    $("#camera-placeholder").hidden = true;
    $("#flip-camera").disabled = false;
    await renderRoll();
  } catch (error) {
    $("#camera-error").textContent =
      error.name === "NotAllowedError"
        ? "Camera permission was not granted. Allow camera access in your browser settings to use your disposable camera."
        : error.name === "NotFoundError"
          ? "No camera found. Open this invitation on a phone or a device with a camera."
          : error.message ||
            "Could not open the camera. Please retry in Safari or Chrome.";
  } finally {
    $("#enable-camera").disabled = false;
  }
}
$("#enable-camera").addEventListener("click", startCamera);
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});
$("#flip-camera").addEventListener("click", () => {
  facing = facing === "environment" ? "user" : "environment";
  startCamera();
});
let rollUrls = [];
async function renderRoll() {
  const photos = (await getPhotos()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  const used = Math.max(
    photos.length,
    Number(
      await storeAction("settings", "readonly", (store) =>
        store.get("film-exposures"),
      ),
    ) || 0,
  );
  const remaining = Math.max(0, FILM_LIMIT - used);
  const developed = filmIsDeveloped(cameraClockNow());
  const allowed = cameraPhase(cameraClockNow()) === "open";
  if (!remaining || !allowed) stopCamera();
  $("#enable-camera").hidden = !remaining || !allowed;
  $("#camera-placeholder h3").textContent = remaining
    ? "A little of your day."
    : "Your roll is complete.";
  $("#camera-placeholder p").textContent = remaining
    ? "24 frames. No retakes. Just the moment."
    : "Every frame is saved for the reveal.";
  rollUrls.forEach((url) => URL.revokeObjectURL(url));
  rollUrls = [];
  $("#roll-count").textContent = remaining
    ? String(remaining).padStart(2, "0") + " / 24 LEFT"
    : "ROLL COMPLETE";
  $("#preview-roll").replaceChildren();
  $("#preview-roll").classList.toggle("undeveloped-roll", !developed);
  $("#download-roll").hidden = !developed;
  $("#download-roll").disabled = !photos.length;
  $("#shutter").disabled = !allowed || !remaining || !stream || photoBusy;
  $("#flip-camera").disabled = !allowed || !remaining || !stream || photoBusy;
  $("#film-reveal-note").textContent = developed
    ? "Your developed roll. These photos are still stored only on this device."
    : "Develops 20 December, 12 noon · Philippine time. No previews until then.";
  if (!developed) {
    for (let i = 0; i < FILM_LIMIT; i++) {
      const frame = document.createElement("span");
      frame.className = "film-frame" + (i < used ? " is-exposed" : "");
      frame.textContent = String(i + 1).padStart(2, "0");
      frame.setAttribute(
        "aria-label",
        "Frame " + (i + 1) + (i < used ? " exposed" : " remaining"),
      );
      $("#preview-roll").append(frame);
    }
  } else {
    if (!photos.length) {
      const empty = document.createElement("p");
      empty.className = "empty-roll";
      empty.textContent = "No frames captured on this device.";
      $("#preview-roll").append(empty);
    }
    photos.forEach((photo, index) => {
      const card = document.createElement("div");
      card.className = "roll-photo";
      const img = document.createElement("img");
      const url = URL.createObjectURL(photo.blob);
      rollUrls.push(url);
      img.src = url;
      img.alt = "Developed frame " + (index + 1);
      card.append(img);
      $("#preview-roll").append(card);
    });
  }
}
$("#shutter").addEventListener("click", async () => {
  if (!stream || photoBusy) return;
  photoBusy = true;
  $("#shutter").disabled = true;
  $("#camera-error").textContent = "";
  try {
    if ((await refreshCameraAccess()) !== "open")
      throw new Error("The wedding-day camera is closed.");
    const canvas = document.createElement("canvas");
    const ratio = Math.min(
      1,
      1920 / Math.max(video.videoWidth, video.videoHeight),
    );
    canvas.width = Math.round(video.videoWidth * ratio);
    canvas.height = Math.round(video.videoHeight * ratio);
    if (!canvas.width || !canvas.height)
      throw new Error("Camera is warming up. Please try again.");
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    if (!blob)
      throw new Error("This frame could not be captured. Please try again.");
    await recordFilmExposure(
      await db(),
      {
        id: crypto.randomUUID(),
        blob,
        createdAt: new Date(cameraClockNow()).toISOString(),
      },
      cameraClockNow(),
    );
    $("#camera-dialog").classList.add("just-exposed");
    setTimeout(() => $("#camera-dialog").classList.remove("just-exposed"), 180);
    toast("Frame exposed. Saved on this device for the reveal.");
  } catch (error) {
    $("#camera-error").textContent = error.message;
  } finally {
    photoBusy = false;
    try {
      await renderRoll();
    } catch (error) {
      $("#camera-error").textContent = error.message;
    }
  }
});
async function exportPreview(includeReply) {
  const photos = await getPhotos();
  const archive = await createPreviewArchive(
    photos,
    includeReply ? await getReply() : undefined,
  );
  download(archive, "paul-roselyn-preview.zip");
  toast("ZIP downloaded with your JPEG photos and preview data.");
}
$("#download-roll").addEventListener("click", async () => {
  await refreshCameraAccess();
  if (!filmIsDeveloped(cameraClockNow())) return;
  try {
    await exportPreview(false);
  } catch (error) {
    $("#camera-error").textContent = error.message;
  }
});
$("#export-data").addEventListener("click", async () => {
  try {
    await exportPreview(true);
  } catch (error) {
    $("#privacy-status").textContent = error.message;
  }
});
$("#clear-data").addEventListener("click", async () => {
  if (
    !(await requestConfirmation(
      "Delete this browser’s preview reply and photos? Export a copy first if you want to keep them.",
    ))
  )
    return;
  try {
    await storeAction("photos", "readwrite", (store) => store.clear());
    await storeAction("settings", "readwrite", (store) => store.clear());
    form.reset();
    attendanceChanged();
    $("#rsvp-status").textContent = "";
    $('button[type="submit"]', form).firstChild.textContent =
      "Save preview reply ";
    await renderRoll();
    $("#privacy-status").textContent =
      "Your preview reply and photos have been deleted from this browser.";
    toast("Device preview data deleted.");
  } catch (error) {
    $("#privacy-status").textContent = error.message;
  }
});
document.addEventListener("visibilitychange", () => {
  if (document.hidden) stopCamera();
});
window.addEventListener("pagehide", stopCamera);
if (import.meta.env.DEV) {
  $("#dev-button").hidden = false;
  $("#dev-button").addEventListener("click", () => openDialog("dev-dialog"));
  const labels = {
    hero: "Cover photograph",
    story: "Our story",
    gallery1: "Memory 01",
    gallery2: "Memory 02",
    gallery3: "Memory 03",
  };
  Object.keys(defaults).forEach((slot) => {
    const row = document.createElement("div");
    row.className = "editor-slot";
    const img = document.createElement("img");
    img.dataset.photo = slot;
    img.alt = `${labels[slot]} preview`;
    const body = document.createElement("div");
    const title = document.createElement("p");
    title.textContent = labels[slot];
    const label = document.createElement("button");
    label.type = "button";
    label.className = "text-button";
    label.textContent = "Replace photo";
    label.setAttribute("aria-label", `Replace ${labels[slot].toLowerCase()}`);
    const input = document.createElement("input");
    input.id = `upload-${slot}`;
    input.type = "file";
    input.accept = "image/jpeg,image/png,image/webp";
    label.addEventListener("click", () => input.click());
    const reset = document.createElement("button");
    reset.type = "button";
    reset.className = "icon-button";
    reset.innerHTML = icon("reset");
    reset.setAttribute(
      "aria-label",
      `Restore default ${labels[slot].toLowerCase()}`,
    );
    const edit = async (method, file) => {
      input.disabled = true;
      reset.disabled = true;
      try {
        if (file && file.size > 8 * 1024 * 1024)
          throw new Error("Choose an image smaller than 8 MB.");
        $("#editor-status").textContent = "Saving to project…";
        const response = await fetch(`/__dev/photos?slot=${slot}`, {
          method,
          body: file,
          headers: file ? { "Content-Type": file.type } : {},
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error);
        customPhotos = result;
        applyPhotos();
        // Bust browser cache after overwriting the same asset filename.
        if (file)
          $$(`[data-photo="${slot}"]`).forEach((el) => {
            el.src = `${customPhotos[slot]}?v=${Date.now()}`;
          });
        $("#editor-status").textContent =
          method === "DELETE"
            ? "Default restored."
            : "Photo saved in the project. It will be included in the next build.";
      } catch (error) {
        $("#editor-status").textContent = error.message;
      } finally {
        input.disabled = false;
        reset.disabled = false;
        input.value = "";
      }
    };
    input.addEventListener("change", () => {
      if (input.files?.[0]) edit("PUT", input.files[0]);
    });
    reset.addEventListener("click", () => edit("DELETE"));
    body.append(title, label, input);
    row.append(img, body, reset);
    $("#photo-settings").append(row);
  });
  applyPhotos();
}

// A trusted wall-clock anchor plus monotonic elapsed time: phone date changes do not unlock capture.
const cameraClock = createEventClock();
let cameraClockRequest = null;
function cameraClockNow() {
  return cameraClock.now();
}
async function refreshCameraAccess() {
  if (cameraClockRequest) return cameraClockRequest;
  cameraClockRequest = (async () => {
    try {
      const response = await fetch("/api/event-status", {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) throw new Error("Clock unavailable");
      const status = await response.json();
      cameraClock.sync(status);
    } catch {
      cameraClock.clear();
    }
    paintCameraAccess();
    return cameraPhase(cameraClockNow());
  })();
  try {
    return await cameraClockRequest;
  } finally {
    cameraClockRequest = null;
  }
}
function paintCameraAccess() {
  const now = cameraClockNow();
  const phase = cameraPhase(now);
  $$("[data-camera-header]").forEach((button) => {
    button.hidden = phase !== "open";
  });
  $$('[data-open="camera-dialog"]:not([data-camera-header])').forEach(
    (button) => {
      if (button.dataset.cameraPhase !== phase) {
        button.dataset.cameraPhase = phase;
        button.innerHTML =
          (phase === "open"
            ? "Open your camera"
            : phase === "closed"
              ? "The guest camera"
              : "Camera opens 19 December") +
          " " +
          icon("arrow");
      }
    },
  );
  const title = $("#camera-schedule-title");
  const message = $("#camera-schedule-message");
  title.textContent =
    phase === "closed"
      ? "A day to remember."
      : phase === "unavailable"
        ? "Let’s check the date."
        : "Your camera awaits.";
  message.textContent =
    phase === "closed"
      ? filmIsDeveloped(now)
        ? "Capture has ended. Your photographs are ready to revisit."
        : "Capture has ended. Your roll develops on 20 December at noon, Philippine time."
      : phase === "unavailable"
        ? "Reconnect so we can confirm access to the wedding-day camera."
        : "24 frames, from midnight to midnight on our wedding day. Philippine time.";
  $("#retry-camera-clock").hidden = phase !== "unavailable";
  $("#open-developed-film").hidden = !filmIsDeveloped(now);
  const left = Math.max(0, CAMERA_OPENS_AT - now);
  $("#camera-unlock-countdown").textContent =
    phase === "scheduled"
      ? Math.floor(left / 86400000) +
        " days · " +
        (Math.floor(left / 3600000) % 24) +
        " hours · " +
        (Math.floor(left / 60000) % 60) +
        " min"
      : phase === "closed"
        ? "Camera closed · 20 December, 12:00 AM"
        : "";
  if (phase !== "open" && $("#camera-dialog").open) {
    stopCamera();
    $("#camera-dialog").close();
    openDialog("camera-locked-dialog");
  }
}
async function renderDevelopedFilm() {
  const target = $("#developed-film");
  target.replaceChildren();
  if (!filmIsDeveloped(cameraClockNow())) return;
  rollUrls.forEach((url) => URL.revokeObjectURL(url));
  rollUrls = [];
  const photos = (await getPhotos()).sort((a, b) =>
    a.createdAt.localeCompare(b.createdAt),
  );
  $("#download-developed-film").disabled = !photos.length;
  if (!photos.length) {
    const note = document.createElement("p");
    note.className = "empty-roll";
    note.textContent = "No frames were captured on this device.";
    target.append(note);
  }
  photos.forEach((photo, i) => {
    const img = document.createElement("img");
    const url = URL.createObjectURL(photo.blob);
    rollUrls.push(url);
    img.src = url;
    img.alt = "Developed frame " + (i + 1);
    target.append(img);
  });
}
$("#retry-camera-clock").addEventListener("click", refreshCameraAccess);
$("#download-developed-film").addEventListener("click", async () => {
  await refreshCameraAccess();
  if (filmIsDeveloped(cameraClockNow())) await exportPreview(false);
});
refreshCameraAccess();
setInterval(() => {
  if (!document.hidden) refreshCameraAccess();
}, 30000);
setInterval(() => {
  if (!document.hidden) paintCameraAccess();
}, 1000);
document.addEventListener("visibilitychange", () => {
  if (!document.hidden) refreshCameraAccess();
});
