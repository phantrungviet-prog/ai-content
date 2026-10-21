import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Verifies the caller is a signed-in admin and returns a Supabase client scoped to them.
// Call at the top of every admin page and server action.
export async function requireAdmin() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  if (!admin) redirect("/login?error=not-admin");

  return { supabase, user: auth.user };
}
