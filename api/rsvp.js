// Fail closed until the invitation-scoped, durable Supabase routes are connected.
module.exports = async function handler(req, res) {
  res.setHeader("Cache-Control", "no-store");
  return res
    .status(503)
    .json({
      error: "RSVP service is not configured. No reply has been saved.",
    });
};
