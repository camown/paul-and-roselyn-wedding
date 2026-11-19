module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "private, no-store");
  if (req.method !== "GET") {
    res.setHeader("Allow", "GET");
    return res.status(405).json({ error: "Method not allowed" });
  }
  const { eventStatus } = await import("../shared/event-window.mjs");
  return res.status(200).json(eventStatus());
};
