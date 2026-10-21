import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache } from "react";
import { formatVnd } from "@/lib/price";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const loadSite = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, type, intro, phone, zalo, address, map_url")
    .eq("slug", slug)
    .maybeSingle();
  if (!client) return null;

  const [{ data: products }, { data: menu }] = await Promise.all([
    supabase
      .from("products")
      .select("id, name, price, description, studio_image_paths")
      .eq("client_id", client.id)
      .order("created_at", { ascending: false })
      .limit(24),
    supabase.from("menus").select("id").eq("client_id", client.id).eq("is_published", true).maybeSingle(),
  ]);

  const publicUrl = (path: string) => supabase.storage.from("public-assets").getPublicUrl(path).data.publicUrl;
  return {
    client,
    hasMenu: Boolean(menu),
    products: (products ?? []).map((p) => ({
      id: p.id as string,
      name: p.name as string,
      price: p.price as number | null,
      description: p.description as string | null,
      imageUrl: (p.studio_image_paths as string[])[0] ? publicUrl(p.studio_image_paths[0]) : null,
    })),
  };
});

// The admin may enter either a Zalo link or a phone number.
function zaloLink(zalo: string): string {
  return /^https?:\/\//.test(zalo) ? zalo : `https://zalo.me/${zalo.replace(/\D/g, "")}`;
}

export async function generateMetadata(props: PageProps<"/s/[slug]">): Promise<Metadata> {
  const data = await loadSite((await props.params).slug);
  if (!data) return { title: "Không tìm thấy" };
  const image = data.products.find((p) => p.imageUrl)?.imageUrl;
  return {
    title: data.client.name,
    description: data.client.intro ?? undefined,
    openGraph: { title: data.client.name, description: data.client.intro ?? undefined, images: image ? [image] : undefined },
  };
}

export default async function SitePage(props: PageProps<"/s/[slug]">) {
  const { slug } = await props.params;
  const data = await loadSite(slug);
  if (!data) notFound();
  const { client, products, hasMenu } = data;

  return (
    <div className="flex-1 bg-white">
      <header className="bg-gradient-to-br from-slate-900 to-indigo-900 px-5 py-16 text-center text-white">
        <h1 className="text-3xl font-bold sm:text-4xl">{client.name}</h1>
        {client.intro && <p className="mx-auto mt-4 max-w-2xl whitespace-pre-line text-white/85">{client.intro}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-medium">
          {hasMenu && (
            <Link href={`/m/${slug}`} className="rounded-full bg-white px-5 py-2.5 text-slate-900">
              Xem menu
            </Link>
          )}
          {client.zalo && (
            <a href={zaloLink(client.zalo)} target="_blank" rel="noreferrer" className="rounded-full bg-sky-500 px-5 py-2.5">
              Nhắn Zalo
            </a>
          )}
          {client.phone && (
            <a href={`tel:${client.phone}`} className="rounded-full border border-white/40 px-5 py-2.5">
              Gọi {client.phone}
            </a>
          )}
        </div>
      </header>

      {products.length > 0 && (
        <section className="mx-auto max-w-6xl px-5 py-12">
          <h2 className="mb-6 text-2xl font-bold">{client.type === "shop" ? "Sản phẩm" : "Món nổi bật"}</h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {products.map((p) => (
              <article key={p.id} className="overflow-hidden rounded-2xl bg-slate-50 ring-1 ring-slate-200">
                {p.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL
                  <img src={p.imageUrl} alt={p.name} className="aspect-square w-full object-cover" loading="lazy" />
                ) : (
                  <div className="flex aspect-square items-center justify-center bg-slate-100 text-4xl text-slate-300">◎</div>
                )}
                <div className="space-y-1 p-4">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-semibold">{p.name}</h3>
                    {p.price != null && <span className="shrink-0 font-semibold text-indigo-700">{formatVnd(p.price)}</span>}
                  </div>
                  {p.description && <p className="line-clamp-4 text-sm text-slate-600">{p.description}</p>}
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {(client.address || client.phone || client.map_url) && (
        <section className="border-t border-slate-100 bg-slate-50 px-5 py-12">
          <div className="mx-auto max-w-6xl space-y-2">
            <h2 className="text-2xl font-bold">Liên hệ</h2>
            {client.address && <p className="text-slate-700">{client.address}</p>}
            {client.phone && (
              <p>
                <a href={`tel:${client.phone}`} className="text-indigo-700">
                  {client.phone}
                </a>
              </p>
            )}
            {client.map_url && (
              <a href={client.map_url} target="_blank" rel="noreferrer" className="btn-secondary mt-2">
                Chỉ đường Google Maps
              </a>
            )}
          </div>
        </section>
      )}

      <footer className="py-6 text-center text-xs text-slate-400">© {client.name}</footer>
    </div>
  );
}
