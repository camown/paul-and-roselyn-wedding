export function readSupabaseConfig(env = {}) {
  const url = env.VITE_SUPABASE_URL?.trim();
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim();
  if (!url && !key) return null;
  if (!url || !key) throw new Error("Set both public Supabase environment variables.");
  let parsed;
  try { parsed = new URL(url); }
  catch { throw new Error("The Supabase project URL is invalid."); }
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(parsed.hostname);
  if ((parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) ||
      parsed.username || parsed.password || parsed.search || parsed.hash || parsed.pathname !== "/")
    throw new Error("Use the Supabase HTTPS project origin (or a local development origin).");
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
    throw new Error("The browser requires a publishable key, never a secret/service-role key.");
  return { url: parsed.origin, key };
}
