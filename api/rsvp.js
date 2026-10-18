// Vercel Serverless Function: /api/rsvp
// Handles RSVP submissions and listing

// In-memory fallback store for serverless lifecycle
let rsvpStore = [
  {
    id: "sample-1",
    name: "Sample Guest (Tita Elena)",
    attendance: "Joyfully Accepts",
    guests: "2",
    contact: "0917-000-0000",
    message: "Congratulations Paul and Roselyn! So excited to celebrate with you both!",
    createdAt: new Date().toISOString()
  }
];

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", "true");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // GET: List all RSVPs
  if (req.method === "GET") {
    return res.status(200).json({
      success: true,
      count: rsvpStore.length,
      rsvps: rsvpStore
    });
  }

  // POST: Create new RSVP
  if (req.method === "POST") {
    try {
      let body = req.body;
      if (typeof body === "string") {
        try {
          body = JSON.parse(body);
        } catch (e) {
          // keep as string
        }
      }

      const { name, attendance, guests, contact, message, dietary } = body || {};

      if (!name || !attendance) {
        return res.status(400).json({
          success: false,
          error: "Name and attendance status are required."
        });
      }

      const newRsvp = {
        id: "rsvp_" + Date.now() + "_" + Math.random().toString(36).substr(2, 6),
        name: String(name).trim(),
        attendance: String(attendance).trim(),
        guests: String(guests || "1").trim(),
        contact: String(contact || "").trim(),
        dietary: String(dietary || "").trim(),
        message: String(message || "").trim(),
        createdAt: new Date().toISOString()
      };

      rsvpStore.unshift(newRsvp);

      return res.status(201).json({
        success: true,
        message: "RSVP recorded successfully! We look forward to celebrating with you.",
        rsvp: newRsvp
      });
    } catch (err) {
      console.error("RSVP Error:", err);
      return res.status(500).json({
        success: false,
        error: "Internal server error while recording RSVP."
      });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
};
