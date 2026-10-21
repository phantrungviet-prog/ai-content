"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { slugify } from "@/lib/slug";

export type FormState = { error?: string; ok?: boolean };

export async function createClientAction(_: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const type = form.get("type") === "shop" ? "shop" : "restaurant";
  if (!name || !slug) return { error: "Nhập tên shop/quán." };

  const { data, error } = await supabase.from("clients").insert({ name, slug, type }).select("id").single();
  if (error) return { error: error.code === "23505" ? `Đường dẫn "${slug}" đã tồn tại, chọn tên khác.` : error.message };

  revalidatePath("/admin");
  redirect(`/admin/clients/${data.id}`);
}

export async function signOutAction() {
  const { supabase } = await requireAdmin();
  await supabase.auth.signOut();
  redirect("/login");
}
