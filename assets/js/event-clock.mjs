import {
  CAMERA_OPENS_AT,
  CAMERA_CLOSES_AT,
  REVEAL_AT,
} from "../../shared/event-window.mjs";

// A server-issued epoch plus monotonic elapsed time. Never use the device wall
// clock to authorize capture, and fail closed if the anchor becomes stale.
export function createEventClock(monotonic = () => performance.now()) {
  let anchor = null;
  return {
    sync(status) {
      anchor = null;
      if (
        !Number.isFinite(status?.serverNow) ||
        status.opensAt !== CAMERA_OPENS_AT ||
        status.closesAt !== CAMERA_CLOSES_AT ||
        status.revealAt !== REVEAL_AT
      )
        throw new Error("Invalid camera schedule");
      anchor = { epoch: status.serverNow, tick: monotonic() };
    },
    now() {
      if (!anchor) return NaN;
      const age = monotonic() - anchor.tick;
      return age >= 0 && age <= 90000 ? anchor.epoch + age : NaN;
    },
    clear() {
      anchor = null;
    },
  };
}
