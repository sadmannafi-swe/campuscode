#!/usr/bin/env node
// Grants the admin role to an existing account. Run from YOUR machine only — it needs the
// service-role key, which must never be shipped to the browser or committed.
//
//   SUPABASE_URL=https://xyz.supabase.co SUPABASE_SERVICE_ROLE_KEY=... npm run admin:grant -- you@example.com
//
// Equivalent SQL (Supabase dashboard → SQL editor):  select public.bootstrap_admin('you@example.com');
import { createClient } from "@supabase/supabase-js";

const [email] = process.argv.slice(2);
const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!email || !url || !key) {
  console.error("Usage: SUPABASE_URL=… SUPABASE_SERVICE_ROLE_KEY=… npm run admin:grant -- <email>");
  process.exit(1);
}
const supabase = createClient(url, key, { auth: { persistSession: false } });
const { data, error } = await supabase.rpc("bootstrap_admin", { p_email: email });
if (error) {
  console.error("Failed:", error.message);
  process.exit(1);
}
console.log(data);
