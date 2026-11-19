import { defineConfig, loadEnv } from "vite";
import { mkdir, readFile, writeFile, rename, readdir, realpath } from "node:fs/promises";
import path from "node:path";
import { eventStatus } from "./shared/event-window.mjs";
import { readSupabaseConfig } from "./shared/supabase-config.mjs";
import { isPhotoSlot } from "./shared/photo-slots.mjs";

// Deliberately available only on the loopback development server, never in a build.
const photoEditor = {
  name: "local-photo-editor",
  configureServer(server) {
    let photoWriteQueue = Promise.resolve();
    // Public files added after startup are absent from Vite's cached file list
    // because content writes intentionally do not trigger reloads. Serve this
    // narrow directory from disk so newly uploaded images work immediately.
    server.middlewares.use("/content", async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const filename = new URL(req.url, "http://localhost").pathname.slice(1);
      const match = filename.match(/^(.+)\.(jpg|png|webp)$/);
      if (filename !== "photos.json" && (!match || !isPhotoSlot(match[1]))) {
        res.statusCode = 404;
        return res.end("Photo not found.");
      }
      if (!["GET", "HEAD"].includes(req.method)) {
        res.statusCode = 405;
        res.setHeader("Allow", "GET, HEAD");
        return res.end();
      }
      try {
        const bytes = await readFile(path.resolve(server.config.root, "public/content", filename));
        res.setHeader("Content-Type", filename === "photos.json" ? "application/json" : match[2] === "jpg" ? "image/jpeg" : `image/${match[2]}`);
        res.setHeader("Content-Length", bytes.length);
        res.end(req.method === "HEAD" ? undefined : bytes);
      } catch (error) {
        res.statusCode = error.code === "ENOENT" ? 404 : 500;
        res.end("Could not load this photograph.");
      }
    });
    server.middlewares.use("/api/rsvp", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "private, no-store");
      res.statusCode = req.method === "GET" ? 200 : 503;
      res.end(JSON.stringify(req.method === "GET" ? { enabled: false } : { error: "Local preview only. No reply has been sent." }));
    });
    server.middlewares.use("/api/event-status", (req, res) => {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "private, no-store");
      if (req.method !== "GET") {
        res.statusCode = 405;
        return res.end(JSON.stringify({ error: "Method not allowed" }));
      }
      res.end(JSON.stringify(eventStatus()));
    });
    server.middlewares.use("/__dev/library", async (req, res) => {
      res.setHeader("Cache-Control", "no-store");
      res.setHeader("X-Content-Type-Options", "nosniff");
      const json = (status, body) => { res.statusCode = status; res.setHeader("Content-Type", "application/json"); res.end(JSON.stringify(body)); };
      if ((req.headers.origin && req.headers.origin !== `http://${req.headers.host}`) || req.headers["sec-fetch-site"] === "cross-site")
        return json(403, { error: "Local library only." });
      if (req.method !== "GET") return json(405, { error: "Method not allowed." });
      try {
        const directory = await realpath(path.resolve(server.config.root, "pictures"));
        const entries = (await readdir(directory, { withFileTypes: true })).filter(entry => entry.isFile() && /\.(?:jpe?g|png|webp)$/i.test(entry.name)).sort((a, b) => a.name.localeCompare(b.name));
        const name = new URL(req.url, "http://localhost").searchParams.get("file");
        if (!name) return json(200, { files: entries.map(entry => ({ name: entry.name, url: `/__dev/library?file=${encodeURIComponent(entry.name)}` })) });
        if (!entries.some(entry => entry.name === name)) return json(404, { error: "Photo not found in pictures." });
        const filename = await realpath(path.join(directory, name));
        if (!filename.startsWith(directory + path.sep)) return json(403, { error: "Local library only." });
        const bytes = await readFile(filename);
        res.setHeader("Content-Type", /\.png$/i.test(name) ? "image/png" : /\.webp$/i.test(name) ? "image/webp" : "image/jpeg");
        res.end(bytes);
      } catch (error) {
        return json(error.code === "ENOENT" ? 200 : 500, error.code === "ENOENT" ? { files: [] } : { error: "Could not read the pictures folder." });
      }
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
      const directory = path.resolve(server.config.root, "public/content");
      const manifest = path.join(directory, "photos.json");
      let releaseWrite;
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
        if (!isPhotoSlot(slot)) {
          res.statusCode = 400;
          return res.end(JSON.stringify({ error: "Unknown photo slot." }));
        }
        const previousWrite = photoWriteQueue;
        photoWriteQueue = new Promise((resolve) => { releaseWrite = resolve; });
        await previousWrite;
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
        await writeFile(manifest + ".tmp", JSON.stringify(saved, null, 2));
        await rename(manifest + ".tmp", manifest);
        res.end(JSON.stringify(saved));
      } catch {
        res.statusCode = 500;
        res.end(
          JSON.stringify({ error: "Could not save this image. Try again." }),
        );
      } finally { releaseWrite?.(); }
    });
  },
};
export default defineConfig(({ mode }) => {
  // Catch incomplete/privileged public credentials before serving or deploying.
  readSupabaseConfig({ ...loadEnv(mode, process.cwd(), "VITE_"), ...process.env });
  return {
    plugins: [photoEditor],
    server: {
      host: "127.0.0.1", port: 3000, strictPort: true,
      watch: { ignored: ["**/.test-artifacts/**", "**/.test-artifacts-*/**", "**/docs/**", "**/tests/**", "**/public/content/**", "**/pictures/**"] },
    },
    build: { target: "es2022" },
  };
});
