import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
import handler from "../api/rsvp.js";

const reply = { id: "12345678-1234-1234-1234-123456789abc", name: "Test guest", attendance: "yes", seats: 2, dietary: "", message: "=1+1" };
const origin = "https://invitation.example";
function response() {
  return { headers: {}, setHeader(k, v) { this.headers[k] = v; }, status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
}
test("Sheets relay validates input and origin and requires matching durable acknowledgement", async () => {
  const keys = ["RSVP_SHEETS_WEBHOOK_URL", "RSVP_SHEETS_SECRET", "RSVP_SITE_ORIGIN"];
  const previous = keys.map(key => process.env[key]);
  const originalFetch = globalThis.fetch;
  try {
    process.env.RSVP_SHEETS_WEBHOOK_URL = "https://script.google.com/macros/s/test-deployment/exec";
    process.env.RSVP_SHEETS_SECRET = "test-only-secret-32-characters-long";
    process.env.RSVP_SITE_ORIGIN = origin;
    let forwarded = 0;
    globalThis.fetch = async (url, options) => {
      forwarded++;
      const body = JSON.parse(options.body);
      assert.equal(body.secret, process.env.RSVP_SHEETS_SECRET);
      assert.equal(body.reply.name, reply.name);
      return { ok: true, json: async () => ({ ok: true, id: reply.id }) };
    };
    const req = { method: "POST", headers: { origin, "content-type": "application/json" }, body: reply };
    let res = response();
    await handler({ method: "GET" }, res);
    assert.deepEqual(res.body, { enabled: true });
    assert.equal(JSON.stringify(res.body).includes("secret"), false);
    for (const [request, code] of [
      [{ ...req, headers: { ...req.headers, origin: "https://other.example" } }, 403],
      [{ ...req, body: { ...reply, seats: 5 } }, 400],
      [{ ...req, body: { ...reply, name: " " } }, 400],
      [{ ...req, body: "{" }, 400],
      [{ ...req, headers: { ...req.headers, "content-length": "9000" } }, 413],
      [{ ...req, method: "DELETE" }, 405],
    ]) {
      res = response(); await handler(request, res); assert.equal(res.code, code);
    }
    assert.equal(forwarded, 0);
    res = response(); await handler(req, res);
    assert.equal(res.code, 200); assert.deepEqual(res.body, { saved: true, id: reply.id });
    for (const result of [{ ok: false }, { ok: true, id: "wrong-id" }]) {
      globalThis.fetch = async () => ({ ok: true, json: async () => result });
      res = response(); await handler(req, res); assert.equal(res.code, 502);
    }
    globalThis.fetch = async () => { throw new Error("Timeout"); };
    res = response(); await handler(req, res); assert.equal(res.code, 502);
    assert.equal(JSON.stringify(res.body).includes(process.env.RSVP_SHEETS_SECRET), false);
  } finally {
    globalThis.fetch = originalFetch;
    keys.forEach((key, i) => { if (previous[i] === undefined) delete process.env[key]; else process.env[key] = previous[i]; });
  }
});

test("Google receiver authenticates before opening sheet, updates IDs and stores formula-like input as text", async () => {
  const rows = []; let opened = 0, flushed = 0, released = 0;
  const sheet = {
    setFrozenRows() {}, getLastRow() { return rows.length; },
    getRange(row, col, count, width) {
      const range = {
        setValues(values) { values.forEach((value, i) => { rows[row - 1 + i] = [...value]; }); return range; },
        getValues() { return rows.slice(row - 1, row - 1 + count).map(r => r.slice(col - 1, col - 1 + width)); },
        setBackground() { return range; }, setFontColor() { return range; }, setFontWeight() { return range; },
      }; return range;
    },
  };
  let exists = false;
  const context = vm.createContext({
    ContentService: { MimeType: { JSON: "json" }, createTextOutput: value => ({ value, setMimeType() { return this; } }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => "test-only-secret-32-characters-long" }) },
    LockService: { getScriptLock: () => ({ waitLock() {}, hasLock: () => true, releaseLock() { released++; } }) },
    Utilities: { formatDate: () => "2026-11-19 12:00:00" },
    SpreadsheetApp: { openById() { opened++; return { getSheetByName: () => exists ? sheet : null, insertSheet() { exists = true; return sheet; } }; }, flush() { flushed++; } },
  });
  vm.runInContext(await readFile("integrations/google-sheets/Code.gs", "utf8"), context);
  const post = (secret, r = reply) => JSON.parse(context.doPost({ postData: { contents: JSON.stringify({ secret, reply: r }) } }).value);
  assert.equal(post("wrong").ok, false); assert.equal(opened, 0);
  assert.equal(post("test-only-secret-32-characters-long", { ...reply, seats: 90 }).ok, false); assert.equal(opened, 0);
  assert.equal(post("test-only-secret-32-characters-long").ok, true);
  assert.equal(rows.length, 2); assert.equal(rows[1][6], "'=1+1");
  assert.equal(post("test-only-secret-32-characters-long", { ...reply, attendance: "no", seats: 0 }).ok, true);
  assert.equal(rows.length, 2); assert.equal(rows[1][3], "No"); assert.equal(rows[1][4], 0);
  assert.equal(flushed, 2); assert.equal(released, 2);
  context.SpreadsheetApp.flush = () => { throw new Error("Write failed"); };
  assert.equal(post("test-only-secret-32-characters-long").ok, false);
  assert.equal(released, 3);
});
