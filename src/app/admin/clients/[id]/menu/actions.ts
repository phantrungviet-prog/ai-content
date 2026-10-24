"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { extractMenuFromImages } from "@/lib/ai";
import { checkAiQuota, recordAiUsage } from "@/lib/ai-quota";
import { requireClientAccess } from "@/lib/auth";
import type { MenuDraft } from "@/lib/menu";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };

export async function extractMenuAction(clientId: string, paths: string[]): Promise<Result<MenuDraft>> {
  const { supabase, isAdmin } = await requireClientAccess(clientId);
  // Only files this client uploaded for its menu; prevents reading arbitrary storage objects.
  if (!paths.length || paths.length > 6 || !paths.every((p) => p.startsWith(`${clientId}/menu/`))) {
    return { ok: false, error: "Danh sách ảnh không hợp lệ (tối đa 6 ảnh)." };
  }
  const quotaError = await checkAiQuota(supabase, clientId, "menu", isAdmin);
  if (quotaError) return { ok: false, error: quotaError };

  try {
    const images = await Promise.all(
      paths.map(async (path) => {
        const { data, error } = await supabase.storage.from("originals").download(path);
        if (error || !data) throw new Error(`Không tải được ảnh ${path}`);
        return { data: Buffer.from(await data.arrayBuffer()), mimeType: data.type || "image/jpeg" };
      }),
    );
    const draft = await extractMenuFromImages(images);
    await recordAiUsage(supabase, clientId, "menu");
    // Refreshes the "calls left today" count on the page.
    revalidatePath(`/admin/clients/${clientId}/menu`);
    if (!draft.categories.length) return { ok: false, error: "Không đọc được món nào từ ảnh. Thử ảnh rõ hơn, chụp thẳng." };

    await supabase.from("menus").upsert({ client_id: clientId, source_image_paths: paths }, { onConflict: "client_id" });
    return { ok: true, data: draft };
  } catch (err) {
    console.error("extractMenuAction failed", { clientId, err });
    return { ok: false, error: err instanceof Error ? err.message : "Lỗi khi đọc menu bằng AI." };
  }
}

const draftSchema = z.object({
  title: z.string().max(200),
  categories: z
    .array(
      z.object({
        name: z.string().trim().min(1, "Danh mục chưa có tên").max(100),
        items: z.array(
          z.object({
            name: z.string().trim().min(1, "Có món chưa có tên").max(200),
            description: z.string().max(1000),
            price: z.number().int().nonnegative().nullable(),
            options: z.array(z.object({ label: z.string().trim().min(1).max(50), price: z.number().int().nonnegative().nullable() })).max(10),
            is_available: z.boolean(),
          }),
        ),
      }),
    )
    .max(50),
});

export async function saveMenuAction(clientId: string, draft: MenuDraft, publish: boolean): Promise<Result<null>> {
  const { supabase } = await requireClientAccess(clientId);
  const parsed = draftSchema.safeParse(draft);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dữ liệu menu không hợp lệ." };

  const { error } = await supabase.rpc("save_menu", {
    p_client_id: clientId,
    p_title: parsed.data.title,
    p_published: publish,
    p_categories: parsed.data.categories,
  });
  if (error) {
    console.error("saveMenuAction failed", { clientId, error });
    return { ok: false, error: error.message };
  }

  const { data: client } = await supabase.from("clients").select("slug").eq("id", clientId).single();
  revalidatePath(`/admin/clients/${clientId}/menu`);
  // save_menu creates a product for every new item name.
  revalidatePath(`/admin/clients/${clientId}/products`);
  if (client) revalidatePath(`/m/${client.slug}`);
  return { ok: true, data: null };
}
