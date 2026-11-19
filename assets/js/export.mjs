import { zipSync, strToU8 } from "fflate";

export async function createPreviewArchive(photos, reply) {
  const files = {};
  const manifest = {
    format: "paul-roselyn-preview-v1",
    exportedAt: new Date().toISOString(),
    photos: [],
  };
  if (reply !== undefined) manifest.reply = reply || null;
  for (const [index, photo] of photos.entries()) {
    const filename = `photos/${String(index + 1).padStart(2, "0")}.jpg`;
    files[filename] = new Uint8Array(await photo.blob.arrayBuffer());
    manifest.photos.push({
      filename,
      id: photo.id,
      createdAt: photo.createdAt,
    });
  }
  files["manifest.json"] = strToU8(JSON.stringify(manifest, null, 2));
  files["README.txt"] = strToU8(
    "Paul & Roselyn — local wedding preview\nThese photos and replies came from this browser only. They have not been sent to the couple.\nOpen photos/ to view your JPEG images.\n",
  );
  return new Blob([zipSync(files, { level: 0 })], { type: "application/zip" });
}
