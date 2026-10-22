"use server";

import { redirect } from "next/navigation";
import type { FormState } from "@/app/admin/actions";
import { requireUser } from "@/lib/auth";
import { slugError, slugify } from "@/lib/slug";

// Creates the signed-in user's one shop. RLS only allows owner_id = the caller, and owner_id is unique.
export async function createOwnShopAction(_: FormState, form: FormData): Promise<FormState> {
  const { supabase, user } = await requireUser();
  const name = String(form.get("name") ?? "").trim();
  const slug = slugify(String(form.get("slug") ?? "") || name);
  const type = form.get("type") === "shop" ? "shop" : "restaurant";
  if (!name) return { error: "Nhập tên cửa hàng." };
  if (name.length > 100) return { error: "Tên cửa hàng tối đa 100 ký tự." };
  const invalidSlug = slugError(slug);
  if (invalidSlug) return { error: invalidSlug };

  const { data, error } = await supabase.from("clients").insert({ name, slug, type, owner_id: user.id }).select("id").single();
  if (error) {
    // Already has a shop (e.g. a double submit): just go to it.
    if (error.code === "23505" && error.message.includes("owner_id")) redirect("/admin");
    if (error.code === "23505") return { error: `Đường dẫn "${slug}" đã có cửa hàng khác dùng, chọn đường dẫn khác.` };
    console.error("createOwnShopAction failed", { userId: user.id, error });
    return { error: "Không tạo được cửa hàng, thử lại sau." };
  }
  redirect(`/admin/clients/${data.id}`);
}
