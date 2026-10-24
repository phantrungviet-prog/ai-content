import Link from "next/link";
import { notFound } from "next/navigation";
import { aiRemainingToday } from "@/lib/ai-quota";
import { requireClientAccess } from "@/lib/auth";
import { ProductManager, type ProductView } from "./ProductManager";

// AI calls run in this page's server actions. Free-tier Gemini can be slow, so allow the Vercel Hobby
// maximum; src/lib/ai.ts times out its own calls well before this.
export const maxDuration = 300;

export default async function ProductsPage(props: PageProps<"/admin/clients/[id]/products">) {
  const { id } = await props.params;
  const { supabase, isAdmin } = await requireClientAccess(id);

  const { data: client } = await supabase.from("clients").select("id, name").eq("id", id).maybeSingle();
  if (!client) notFound();

  const { data: rows } = await supabase
    .from("products")
    .select("id, name, price, description, original_image_path, studio_image_paths, is_featured, menu_items(count)")
    .eq("client_id", id)
    .order("is_featured", { ascending: false })
    .order("created_at", { ascending: false });

  // Originals are private: sign them for an hour so the admin can see them.
  const originalPaths = (rows ?? []).map((r) => r.original_image_path).filter(Boolean) as string[];
  const { data: signed } = originalPaths.length
    ? await supabase.storage.from("originals").createSignedUrls(originalPaths, 3600)
    : { data: [] };
  const signedByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const postsLeft = await aiRemainingToday(supabase, id, "post", isAdmin);
  const publicUrl = (path: string) => supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;

  const products: ProductView[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    description: r.description ?? "",
    originalUrl: r.original_image_path ? (signedByPath.get(r.original_image_path) ?? null) : null,
    studioImages: (r.studio_image_paths as string[]).map((path) => ({ path, url: publicUrl(path) })),
    isFeatured: r.is_featured as boolean,
    inMenu: ((r.menu_items as { count: number }[] | null)?.[0]?.count ?? 0) > 0,
  }));

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/clients/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← {client.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Sản phẩm · Ảnh Studio · Viết bài</h1>
      </div>
      {/* Automatic generation needs a billed Gemini project; without it the admin uses the Gemini app by hand. */}
      <ProductManager clientId={id} products={products} autoStudio={process.env.GEMINI_IMAGE_ENABLED === "true"} postsLeft={postsLeft} />
    </div>
  );
}
