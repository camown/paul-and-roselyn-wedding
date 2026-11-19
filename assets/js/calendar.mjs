export function createCalendar(now = new Date()) {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Paul and Roselyn//Wedding//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    "UID:paul-roselyn-20261219@wedding.local",
    `DTSTAMP:${now
      .toISOString()
      .replace(/[-:]/g, "")
      .replace(/\.\d{3}/, "")}`,
    "DTSTART:20261219T010000Z",
    "DTEND:20261219T060000Z",
    "SUMMARY:Paul & Roselyn Wedding",
    "LOCATION:Our Lady of the Pillar Parish (Imus Cathedral)\\, Imus\\, Cavite",
    "DESCRIPTION:Ceremony 9 AM at Imus Cathedral. Reception 11 AM to 2 PM at Nathan's Catering & Events Services\\, Imus.",
    "END:VEVENT",
    "END:VCALENDAR",
    "",
  ];
  // Event fields are ASCII. Fold content lines for calendar importers.
  return lines
    .map((line) => line.match(/.{1,73}/g)?.join("\r\n ") || "")
    .join("\r\n");
}
