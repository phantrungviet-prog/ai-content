import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/auth";
import { ProductManager, type ProductView } from "./ProductManager";

// Image generation and copywriting run in this page's server actions and can take ~30s.
export const maxDuration = 60;

export default async function ProductsPage(props: PageProps<"/admin/clients/[id]/products">) {
  const { id } = await props.params;
  const { supabase } = await requireClientAccess(id);

  const { data: client } = await supabase.from("clients").select("id, name").eq("id", id).maybeSingle();
  if (!client) notFound();

  const { data: rows } = await supabase
    .from("products")
    .select("id, name, price, description, original_image_path, studio_image_paths")
    .eq("client_id", id)
    .order("created_at", { ascending: false });

  // Originals are private: sign them for an hour so the admin can see them.
  const originalPaths = (rows ?? []).map((r) => r.original_image_path).filter(Boolean) as string[];
  const { data: signed } = originalPaths.length
    ? await supabase.storage.from("originals").createSignedUrls(originalPaths, 3600)
    : { data: [] };
  const signedByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
  const publicUrl = (path: string) => supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;

  const products: ProductView[] = (rows ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    price: r.price,
    description: r.description ?? "",
    originalUrl: r.original_image_path ? (signedByPath.get(r.original_image_path) ?? null) : null,
    studioImages: (r.studio_image_paths as string[]).map((path) => ({ path, url: publicUrl(path) })),
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
      <ProductManager clientId={id} products={products} autoStudio={process.env.GEMINI_IMAGE_ENABLED === "true"} />
    </div>
  );
}
