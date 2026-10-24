"use server";

import { revalidatePath } from "next/cache";
import { notFound } from "next/navigation";
import { generatePost, generateStudioImage, type GeneratedPost, type ImageInput } from "@/lib/ai";
import {
  ASPECT_RATIOS,
  PLATFORMS,
  STUDIO_PRESETS,
  TONES,
  type AspectRatio,
  type Platform,
  type StudioPreset,
  type Tone,
} from "@/lib/ai-options";
import { checkAiQuota, recordAiUsage } from "@/lib/ai-quota";
import { assertCanManage, requireClientAccess, requireUser } from "@/lib/auth";
import { formatVnd, parseVndPrice } from "@/lib/price";

type Result<T> = { ok: true; data: T } | { ok: false; error: string };
type Supabase = Awaited<ReturnType<typeof requireUser>>["supabase"];

const fail = (error: unknown, fallback: string): { ok: false; error: string } => ({
  ok: false,
  error: error instanceof Error ? error.message : fallback,
});

// Products are publicly readable, so loading one proves nothing: also check the caller manages its client.
// Call outside try/catch: notFound() works by throwing.
async function requireProductAccess(productId: string) {
  const { supabase, isAdmin } = await requireUser();
  const { data } = await supabase
    .from("products")
    .select("id, client_id, name, price, description, original_image_path, studio_image_paths")
    .eq("id", productId)
    .maybeSingle();
  if (!data) notFound();
  await assertCanManage(supabase, data.client_id);
  const product = data as {
    id: string;
    client_id: string;
    name: string;
    price: number | null;
    description: string | null;
    original_image_path: string | null;
    studio_image_paths: string[];
  };
  return { supabase, isAdmin, product };
}

async function downloadOriginal(supabase: Supabase, path: string): Promise<ImageInput> {
  const { data, error } = await supabase.storage.from("originals").download(path);
  if (error || !data) throw new Error("Không tải được ảnh gốc");
  return { data: Buffer.from(await data.arrayBuffer()), mimeType: data.type || "image/jpeg" };
}

const refresh = (clientId: string) => revalidatePath(`/admin/clients/${clientId}/products`);

export async function createProductAction(
  clientId: string,
  input: { name: string; price: string; description: string; imagePath: string | null },
): Promise<Result<null>> {
  const { supabase } = await requireClientAccess(clientId);
  const name = input.name.trim();
  if (!name) return { ok: false, error: "Nhập tên sản phẩm." };
  if (input.imagePath && !input.imagePath.startsWith(`${clientId}/products/`)) return { ok: false, error: "Ảnh không hợp lệ." };

  const { error } = await supabase.from("products").insert({
    client_id: clientId,
    name,
    price: parseVndPrice(input.price),
    description: input.description.trim() || null,
    original_image_path: input.imagePath,
  });
  if (error) return { ok: false, error: error.message };
  refresh(clientId);
  return { ok: true, data: null };
}

export async function deleteProductAction(productId: string): Promise<Result<null>> {
  const { supabase, product } = await requireProductAccess(productId);
  try {
    const { error } = await supabase.from("products").delete().eq("id", productId);
    if (error) throw new Error(error.message);
    // Best effort: a leftover file is harmless, a failed delete of the row is not.
    if (product.original_image_path) await supabase.storage.from("originals").remove([product.original_image_path]);
    if (product.studio_image_paths.length) await supabase.storage.from("public-assets").remove(product.studio_image_paths);
    refresh(product.client_id);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err, "Không xóa được sản phẩm.");
  }
}

// Generates a candidate image. It is stored but not attached to the product until the admin approves it.
export async function generateStudioImageAction(
  productId: string,
  preset: StudioPreset,
  aspectRatio: AspectRatio,
): Promise<Result<{ path: string; url: string }>> {
  const { supabase, isAdmin, product } = await requireProductAccess(productId);
  if (!(preset in STUDIO_PRESETS) || !ASPECT_RATIOS.includes(aspectRatio)) return { ok: false, error: "Lựa chọn không hợp lệ." };
  const quotaError = await checkAiQuota(supabase, product.client_id, "image", isAdmin);
  if (quotaError) return { ok: false, error: quotaError };

  try {
    if (!product.original_image_path) return { ok: false, error: "Sản phẩm chưa có ảnh gốc." };

    const result = await generateStudioImage(await downloadOriginal(supabase, product.original_image_path), preset, aspectRatio);
    await recordAiUsage(supabase, product.client_id, "image");
    const ext = result.mimeType === "image/jpeg" ? "jpg" : "png";
    const path = `${product.client_id}/products/${product.id}/${crypto.randomUUID()}.${ext}`;
    const { error } = await supabase.storage.from("public-assets").upload(path, result.data, { contentType: result.mimeType });
    if (error) throw new Error(`Không lưu được ảnh: ${error.message}`);

    return { ok: true, data: { path, url: supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl } };
  } catch (err) {
    console.error("generateStudioImageAction failed", { productId, preset, err });
    return fail(err, "Lỗi khi tạo ảnh.");
  }
}

function assertOwnPath(product: { id: string; client_id: string }, path: string) {
  if (!path.startsWith(`${product.client_id}/products/${product.id}/`)) throw new Error("Ảnh không thuộc sản phẩm này.");
}

export async function approveStudioImageAction(productId: string, path: string): Promise<Result<null>> {
  const { supabase, product } = await requireProductAccess(productId);
  try {
    assertOwnPath(product, path);
    if (!product.studio_image_paths.includes(path)) {
      const { error } = await supabase
        .from("products")
        .update({ studio_image_paths: [...product.studio_image_paths, path] })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    }
    refresh(product.client_id);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err, "Không lưu được ảnh.");
  }
}

// Removes an image, whether it is an unapproved candidate or an already approved one.
export async function removeStudioImageAction(productId: string, path: string): Promise<Result<null>> {
  const { supabase, product } = await requireProductAccess(productId);
  try {
    assertOwnPath(product, path);
    if (product.studio_image_paths.includes(path)) {
      const { error } = await supabase
        .from("products")
        .update({ studio_image_paths: product.studio_image_paths.filter((p) => p !== path) })
        .eq("id", productId);
      if (error) throw new Error(error.message);
    }
    await supabase.storage.from("public-assets").remove([path]);
    refresh(product.client_id);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err, "Không xóa được ảnh.");
  }
}

export async function generatePostAction(productId: string, platform: Platform, tone: Tone): Promise<Result<GeneratedPost>> {
  const { supabase, isAdmin, product } = await requireProductAccess(productId);
  if (!(platform in PLATFORMS) || !(tone in TONES)) return { ok: false, error: "Lựa chọn không hợp lệ." };
  const quotaError = await checkAiQuota(supabase, product.client_id, "post", isAdmin);
  if (quotaError) return { ok: false, error: quotaError };

  try {
    const { data: client } = await supabase.from("clients").select("name, type, phone, address").eq("id", product.client_id).single();
    if (!client) throw new Error("Không tìm thấy khách hàng");

    const image = product.original_image_path ? await downloadOriginal(supabase, product.original_image_path) : undefined;
    const post = await generatePost(
      {
        shopName: client.name,
        shopType: client.type,
        phone: client.phone,
        address: client.address,
        productName: product.name,
        price: formatVnd(product.price),
        notes: product.description ?? "",
        platform,
        tone,
      },
      image,
    );
    await recordAiUsage(supabase, product.client_id, "post");
    // Refreshes the "calls left today" count on the page.
    refresh(product.client_id);

    await supabase.from("content_posts").insert({
      client_id: product.client_id,
      product_id: product.id,
      platform,
      tone,
      body: post.video_idea ? `${post.body}\n\n${post.video_idea}` : post.body,
      hashtags: post.hashtags,
    });
    return { ok: true, data: post };
  } catch (err) {
    console.error("generatePostAction failed", { productId, platform, err });
    return fail(err, "Lỗi khi viết bài.");
  }
}

export async function saveDescriptionAction(productId: string, description: string): Promise<Result<null>> {
  const { supabase, product } = await requireProductAccess(productId);
  try {
    const { error } = await supabase.from("products").update({ description: description.trim() || null }).eq("id", productId);
    if (error) throw new Error(error.message);
    refresh(product.client_id);
    return { ok: true, data: null };
  } catch (err) {
    return fail(err, "Không lưu được mô tả.");
  }
}
