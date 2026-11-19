// Google credentials and the receiver secret stay on the server.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  const endpoint = process.env.RSVP_SHEETS_WEBHOOK_URL || "";
  const secret = process.env.RSVP_SHEETS_SECRET || "";
  const origin = process.env.RSVP_SITE_ORIGIN || "";
  const enabled = /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(endpoint)
    && secret.length >= 32 && /^https:\/\/[^/]+$/.test(origin);
  if (req.method === "GET") return res.status(200).json({ enabled });
  if (!enabled) return res.status(503).json({ error: "RSVP service is not configured. No reply has been saved." });
  if (req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "Method not allowed." });
  }
  if (req.headers?.origin !== origin) return res.status(403).json({ error: "Please send your reply from the invitation website." });
  if (!String(req.headers?.["content-type"] || "").startsWith("application/json"))
    return res.status(415).json({ error: "Please send a JSON reply." });
  if (Number(req.headers?.["content-length"] || 0) > 8192)
    return res.status(413).json({ error: "Your reply is too long." });
  let body;
  try {
    if (req.body !== undefined) body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    else {
      let raw = "";
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 8192) return res.status(413).json({ error: "Your reply is too long." });
      }
      body = JSON.parse(raw);
    }
    if (Buffer.byteLength(JSON.stringify(body)) > 8192) return res.status(413).json({ error: "Your reply is too long." });
  } catch { return res.status(400).json({ error: "Please check your reply and try again." }); }
  const text = (value, max) => typeof value === "string" && value.trim().length <= max ? value.trim() : null;
  const reply = {
    id: text(body?.id, 36), name: text(body?.name, 120), attendance: body?.attendance,
    seats: body?.attendance === "no" ? 0 : 1,
    dietary: "", message: text(body?.message, 1500),
  };
  if (!/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(reply.id || "") || !reply.name
    || !["yes", "no"].includes(reply.attendance) || !Number.isInteger(reply.seats)
    || (body?.seats !== undefined && body.seats !== reply.seats) || reply.message === null)
    return res.status(400).json({ error: "Please check your name and attendance. Each invitation is for one guest." });
  try {
    const upstream = await fetch(endpoint, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, reply }), signal: AbortSignal.timeout(7000),
    });
    const result = await upstream.json();
    if (!upstream.ok || result.ok !== true || result.id !== reply.id) throw new Error("Unconfirmed write");
    return res.status(200).json({ saved: true, id: reply.id });
  } catch {
    return res.status(502).json({ error: "We couldn’t confirm your reply. Please try again; your reply will not be duplicated." });
  }
};
