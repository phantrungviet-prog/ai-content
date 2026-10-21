"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import type { FormState } from "@/app/admin/actions";

export async function updateClientAction(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireAdmin();
  const text = (key: string) => String(form.get(key) ?? "").trim() || null;

  const name = text("name");
  if (!name) return { error: "Tên không được để trống." };

  // slug is deliberately not editable: it is printed in QR codes.
  const { error } = await supabase
    .from("clients")
    .update({
      name,
      type: form.get("type") === "shop" ? "shop" : "restaurant",
      phone: text("phone"),
      zalo: text("zalo"),
      address: text("address"),
      map_url: text("map_url"),
      intro: text("intro"),
    })
    .eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}
