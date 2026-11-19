export const CAMERA_OPENS_AT = Date.parse("2026-12-19T00:00:00+08:00");
export const CAMERA_CLOSES_AT = Date.parse("2026-12-20T00:00:00+08:00");
export const REVEAL_AT = Date.parse("2026-12-20T12:00:00+08:00");

export function cameraPhase(now) {
  if (!Number.isFinite(now)) return "unavailable";
  if (now < CAMERA_OPENS_AT) return "scheduled";
  return now < CAMERA_CLOSES_AT ? "open" : "closed";
}

export function eventStatus(now = Date.now()) {
  return {
    serverNow: now,
    opensAt: CAMERA_OPENS_AT,
    closesAt: CAMERA_CLOSES_AT,
    revealAt: REVEAL_AT,
    phase: cameraPhase(now),
  };
}
