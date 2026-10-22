import "server-only";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

// Verifies the caller is signed in and returns a Supabase client scoped to them.
// isAdmin is the super admin who manages every shop (public.admins).
export async function requireUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/login");

  const { data: admin } = await supabase.from("admins").select("user_id").eq("user_id", auth.user.id).maybeSingle();
  return { supabase, user: auth.user, isAdmin: !!admin };
}

// Throws notFound() unless the caller owns the client or is an admin. Shop pages are publicly readable,
// so seeing the row through RLS is not enough: this asks the database's can_manage() directly.
export async function assertCanManage(supabase: Supabase, clientId: string) {
  const { data, error } = await supabase.rpc("can_manage", { p_client_id: clientId });
  if (error || data !== true) notFound();
}

// Call at the top of every page and server action that works on one client. RLS enforces the same rule.
export async function requireClientAccess(clientId: string) {
  const session = await requireUser();
  await assertCanManage(session.supabase, clientId);
  return session;
}

// For actions only the super admin may take, such as creating a shop without an owner.
export async function requireSuperAdmin() {
  const session = await requireUser();
  if (!session.isAdmin) notFound();
  return session;
}
