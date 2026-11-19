export const FILM_LIMIT = 12;
import { cameraPhase, REVEAL_AT } from "../../shared/event-window.mjs";
// Local preview setting. Production reveal must be enforced by the server.
export const FILM_REVEAL_AT = REVEAL_AT;
export const filmIsDeveloped = (now = Date.now()) => now >= FILM_REVEAL_AT;

// One read/write transaction serializes exposure allocation across browser tabs.
// This is device-local consistency, not production invitation authorization.
export function recordFilmExposure(database, photo, now = Date.now()) {
  if (cameraPhase(now) !== "open")
    return Promise.reject(
      new Error(
        "The guest camera is only available on 19 December 2026, Philippine time.",
      ),
    );
  return new Promise((resolve, reject) => {
    const tx = database.transaction(["photos", "settings"], "readwrite");
    const photos = tx.objectStore("photos");
    const settings = tx.objectStore("settings");
    let used, failure;
    const count = photos.count();
    count.onsuccess = () => {
      const ledger = settings.get("film-exposures");
      ledger.onsuccess = () => {
        used = Math.max(count.result, Number(ledger.result) || 0);
        if (used >= FILM_LIMIT) {
          failure = new Error(
            "Your roll is complete. Every frame is saved for the reveal.",
          );
          tx.abort();
          return;
        }
        photos.add({ ...photo, source: "camera" });
        settings.put(++used, "film-exposures");
      };
    };
    tx.oncomplete = () => resolve(used);
    tx.onabort = tx.onerror = () =>
      reject(
        failure ||
          new Error(
            "The frame could not be saved on this device. Please retry.",
          ),
      );
  });
}
