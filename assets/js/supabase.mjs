import { createClient } from "@supabase/supabase-js";
import { readSupabaseConfig } from "../../shared/supabase-config.mjs";

let client;
export function getSupabaseClient() {
  if (client) return client;
  const config = readSupabaseConfig(import.meta.env);
  if (!config) return null;
  client = createClient(config.url, config.key, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // Invitation fragments are not OAuth callbacks. Add an explicit host callback later.
      detectSessionInUrl: false,
      flowType: "pkce",
      storageKey: "pr-wedding-host-auth",
    },
  });
  return client;
}
