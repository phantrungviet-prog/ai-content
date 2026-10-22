"use server";

import { revalidatePath } from "next/cache";
import { requireClientAccess } from "@/lib/auth";
import type { FormState } from "@/app/admin/actions";
import { BANKS } from "@/lib/vietqr";

export async function updateClientAction(clientId: string, _: FormState, form: FormData): Promise<FormState> {
  const { supabase } = await requireClientAccess(clientId);
  const text = (key: string) => String(form.get(key) ?? "").trim() || null;

  const name = text("name");
  if (!name) return { error: "Tên không được để trống." };

  const bankBin = text("bank_bin");
  const bankAccountNo = text("bank_account_no")?.replace(/\s+/g, "") ?? null;
  if (bankBin && !BANKS.some((b) => b.bin === bankBin)) return { error: "Ngân hàng không hợp lệ." };
  if (bankBin && !/^[0-9A-Za-z]{1,19}$/.test(bankAccountNo ?? "")) return { error: "Nhập số tài khoản hợp lệ (chỉ chữ và số)." };

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
      bank_bin: bankBin,
      bank_account_no: bankBin ? bankAccountNo : null,
      bank_account_name: bankBin ? (text("bank_account_name")?.toUpperCase() ?? null) : null,
    })
    .eq("id", clientId);
  if (error) return { error: error.message };

  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true };
}
