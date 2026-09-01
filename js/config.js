/* ============================================================
   CONFIG — the project this app syncs to by default.

   Pre-filling these means a new device only has to sign in with
   an email, instead of pasting a long URL and key on a phone
   keyboard. Settings can still override them.

   Safe to commit, even in a public repo:
   the publishable (anon) key is *designed* to ship inside web
   pages. It grants no data access on its own — the `records`
   table has row level security enabled, so it only ever returns
   rows belonging to the signed-in user, and anonymous access is
   revoked outright. See supabase/schema.sql.

   The one rule that keeps that true: any table added to this
   Supabase project later must also enable RLS. A table without
   it would be readable by anyone holding this key.

   Never put a `service_role` / secret key in this file — those
   bypass row level security entirely.
   ============================================================ */
window.CAULDRON_CONFIG = {
  supabaseUrl: "https://aawjfawofpqotqqybrfa.supabase.co",
  supabaseAnonKey: "sb_publishable_vGjQhugr9JAUsS_K6OVqVA_TLYNnSYT",
};
