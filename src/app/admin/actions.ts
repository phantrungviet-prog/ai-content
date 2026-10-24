"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireSuperAdmin, requireUser } from "@/lib/auth";
import { slugError, slugify } from "@/lib/slug";

export type FormState = { error?: string; ok?: boolean };

// Shops created here have no owner and are managed by the super admin (service mode).
export async function createClientAction(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireSuperAdmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const type = form.get("type") === "shop" ? "shop" : "restaurant";
  if (!name) return { error: "Nhập tên shop/quán." };
  const invalidSlug = slugError(slug);
  if (invalidSlug) return { error: invalidSlug };

  const { data, error } = await supabase.from("clients").insert({ name, slug, type }).select("id").single();
  if (error) return { error: error.code === "23505" ? `Đường dẫn "${slug}" đã tồn tại, chọn tên khác.` : error.message };

  revalidatePath("/admin");
  redirect(`/admin/clients/${data.id}`);
}

export async function signOutAction() {
  const { supabase } = await requireUser();
  await supabase.auth.signOut();
  redirect("/login");
}

// A disabled shop's public pages return 404; the owner can still sign in and see their data.
export async function setClientDisabledAction(clientId: string, disabled: boolean) {
  const { supabase } = await requireSuperAdmin();
  const { data, error } = await supabase.from("clients").update({ is_disabled: disabled }).eq("id", clientId).select("slug").single();
  if (error) throw new Error(`Không cập nhật được trạng thái khóa: ${error.message}`);

  revalidatePath("/admin");
  revalidatePath(`/admin/clients/${clientId}`);
  revalidatePath(`/m/${data.slug}`);
  revalidatePath(`/s/${data.slug}`);
}
