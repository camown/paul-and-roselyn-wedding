import { test } from "node:test";
import assert from "node:assert/strict";
import { readSupabaseConfig } from "../shared/supabase-config.mjs";

test("Supabase config allows an unconfigured preview and rejects incomplete or privileged credentials", () => {
  assert.equal(readSupabaseConfig({}), null);
  assert.throws(() => readSupabaseConfig({ VITE_SUPABASE_URL: "https://example.supabase.co" }), /both/);
  const env = { VITE_SUPABASE_URL: "https://example.supabase.co", VITE_SUPABASE_PUBLISHABLE_KEY: "sb_publishable_test" };
  assert.deepEqual(readSupabaseConfig(env), { url: "https://example.supabase.co", key: "sb_publishable_test" });
  for (const key of ["sb_secret_test", "eyJserviceRoleToken", " "])
    assert.throws(() => readSupabaseConfig({ ...env, VITE_SUPABASE_PUBLISHABLE_KEY: key }));
  for (const url of ["http://example.supabase.co", "https://user:pass@example.supabase.co", "https://example.supabase.co/rest/v1", "https://example.supabase.co?key=abc", "invalid"])
    assert.throws(() => readSupabaseConfig({ ...env, VITE_SUPABASE_URL: url }));
  assert.equal(readSupabaseConfig({ ...env, VITE_SUPABASE_URL: "http://127.0.0.1:54321" }).url, "http://127.0.0.1:54321");
});
