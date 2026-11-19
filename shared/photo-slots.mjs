export const primaryPhotoSlots = ["hero", "keepsake", "story", "gallery1", "gallery2", "gallery3"];
export const isOpeningPhotoSlot = (slot) => typeof slot === "string" && /^opening-[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/.test(slot);
export const isPhotoSlot = (slot) => primaryPhotoSlots.includes(slot) || isOpeningPhotoSlot(slot);
export const openingPhotoSlots = (manifest = {}) => ["hero", "keepsake", ...Object.keys(manifest).filter(isOpeningPhotoSlot)];
