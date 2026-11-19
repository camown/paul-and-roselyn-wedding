import { readSupabaseConfig } from "../shared/supabase-config.mjs";

try {
  const config = readSupabaseConfig(process.env);
  if (!config) throw new Error("Add public Supabase settings to .env.local first.");
  const response = await fetch(config.url + "/auth/v1/settings", {
    headers: { apikey: config.key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error("Supabase public connection returned HTTP " + response.status);
  const settings = await response.json();
  if (!settings || typeof settings.external !== "object")
    throw new Error("Supabase returned an unexpected authentication settings response.");
  console.log("Supabase public connection verified: " + new URL(config.url).hostname);
  console.log("Read-only check only. No users, tables, RSVPs or photos were created.");
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
