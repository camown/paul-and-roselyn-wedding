import { defineConfig } from "vite";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { eventStatus } from "./shared/event-window.mjs";

// Deliberately available only on the loopback development server, never in a build.
const photoEditor = {
  name: "local-photo-editor",
  configureServer(server) {
    server.middlewares.use("/api/event-status", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "private, no-store");
      if (req.method !== "GET") {
        res.statusCode = 405;
        return res.end(JSON.stringify({ error: "Method not allowed" }));
      }
      res.end(JSON.stringify(eventStatus()));
    });
    server.middlewares.use("/__dev/photos", async (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "no-store");
      if (
        req.headers.origin &&
        req.headers.origin !== `http://${req.headers.host}`
      ) {
        res.statusCode = 403;
        return res.end(JSON.stringify({ error: "Local editor only." }));
      }
      const slots = ["hero", "story", "gallery1", "gallery2", "gallery3"];
      const directory = path.resolve("public/content");
      const manifest = path.join(directory, "photos.json");
      try {
        if (req.method === "GET") {
          let saved = {};
          try {
            saved = JSON.parse(await readFile(manifest, "utf8"));
          } catch {}
          return res.end(JSON.stringify(saved));
        }
        const slot = new URL(req.url, "http://localhost").searchParams.get(
          "slot",
        );
        if (!slots.includes(slot)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Unknown photo slot." }));
        }
        let saved = {};
        try {
          saved = JSON.parse(await readFile(manifest, "utf8"));
        } catch {}
        if (req.method === "DELETE") {
          delete saved[slot];
        } else if (req.method === "PUT") {
          const chunks = [];
          let length = 0;
          for await (const chunk of req) {
            length += chunk.length;
            if (length > 8 * 1024 * 1024) {
              res.statusCode = 413;
              return res.end(
                JSON.stringify({ error: "Choose an image smaller than 8 MB." }),
              );
            }
            chunks.push(chunk);
          }
          const bytes = Buffer.concat(chunks);
          const jpeg =
            bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
          const png = bytes
            .subarray(0, 8)
            .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
          const webp =
            bytes.toString("ascii", 0, 4) === "RIFF" &&
            bytes.toString("ascii", 8, 12) === "WEBP";
          if (!jpeg && !png && !webp) {
            res.statusCode = 415;
            return res.end(
              JSON.stringify({ error: "Use a JPG, PNG or WebP image." }),
            );
          }
          const filename = `${slot}.${jpeg ? "jpg" : png ? "png" : "webp"}`;
          await mkdir(directory, { recursive: true });
          await writeFile(path.join(directory, filename), bytes);
          saved[slot] = `/content/${filename}`;
        } else {
          res.statusCode = 405;
          return res.end(JSON.stringify({ error: "Method not allowed." }));
        }
        await mkdir(directory, { recursive: true });
        await writeFile(manifest, JSON.stringify(saved, null, 2));
        res.end(JSON.stringify(saved));
      } catch {
        res.statusCode = 500;
        res.end(
          JSON.stringify({ error: "Could not save this image. Try again." }),
        );
      }
    });
  },
};
export default defineConfig({
  plugins: [photoEditor],
  server: { host: "127.0.0.1", port: 3000, strictPort: true },
  build: { target: "es2022" },
});
