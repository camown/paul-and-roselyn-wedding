// Paste into Extensions > Apps Script in the couple's PRIVATE spreadsheet.
// Set Script Property RSVP_SECRET to the same random secret used by Vercel.
const RSVP_SHEET_ID = "1F0B2MTjam1Qf2AomkvhsHCbWH_vVgvJ-qAapf9wdSjc";
const RSVP_TAB = "Website RSVPs";
const RSVP_COLUMNS = ["Reply ID", "Received / updated (Philippine time)", "Name", "Attending", "Seats", "Dietary notes", "Message"];
function doGet() { return json_({ ok: false }); }
function json_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
function safeText_(value) {
  return /^[\s]*[=+@-]/.test(value) ? "'" + value : value;
}
function doPost(e) {
  let lock;
  try {
    if (!e || !e.postData || e.postData.contents.length > 12000) return json_({ ok: false });
    const data = JSON.parse(e.postData.contents);
    const secret = PropertiesService.getScriptProperties().getProperty("RSVP_SECRET");
    if (!secret || secret.length < 32 || data.secret !== secret) return json_({ ok: false });
    const r = data.reply;
    if (!r || !/^[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(r.id)
      || typeof r.name !== "string" || !r.name.trim() || r.name.length > 120
      || !["yes", "no"].includes(r.attendance) || !Number.isInteger(r.seats)
      || (r.attendance === "no" ? r.seats !== 0 : r.seats < 1 || r.seats > 4)
      || typeof r.dietary !== "string" || r.dietary.length > 500
      || typeof r.message !== "string" || r.message.length > 1500) return json_({ ok: false });
    lock = LockService.getScriptLock();
    lock.waitLock(5000);
    const book = SpreadsheetApp.openById(RSVP_SHEET_ID);
    let sheet = book.getSheetByName(RSVP_TAB);
    if (!sheet) {
      sheet = book.insertSheet(RSVP_TAB);
      sheet.getRange(1, 1, 1, RSVP_COLUMNS.length).setValues([RSVP_COLUMNS]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, RSVP_COLUMNS.length).setBackground("#873f2e").setFontColor("#fff6e8").setFontWeight("bold");
    }
    if (JSON.stringify(sheet.getRange(1, 1, 1, RSVP_COLUMNS.length).getValues()[0]) !== JSON.stringify(RSVP_COLUMNS)) return json_({ ok: false });
    const count = sheet.getLastRow();
    const ids = count > 1 ? sheet.getRange(2, 1, count - 1, 1).getValues().flat() : [];
    const existing = ids.indexOf(r.id);
    const row = existing < 0 ? count + 1 : existing + 2;
    sheet.getRange(row, 1, 1, RSVP_COLUMNS.length).setValues([[
      r.id, Utilities.formatDate(new Date(), "Asia/Manila", "yyyy-MM-dd HH:mm:ss"),
      safeText_(r.name.trim()), r.attendance === "yes" ? "Yes" : "No", r.seats,
      safeText_(r.attendance === "no" ? "" : r.dietary), safeText_(r.message),
    ]]);
    SpreadsheetApp.flush();
    return json_({ ok: true, id: r.id });
  } catch { return json_({ ok: false }); }
  finally { if (lock && lock.hasLock()) lock.releaseLock(); }
}
