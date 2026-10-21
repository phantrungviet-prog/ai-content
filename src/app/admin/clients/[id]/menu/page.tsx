import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { requireAdmin } from "@/lib/auth";
import type { MenuDraft } from "@/lib/menu";
import { siteUrl } from "@/lib/site-url";
import { MenuEditor } from "./MenuEditor";

// AI menu extraction runs inside this page's server action and can take ~30s.
export const maxDuration = 60;

export default async function MenuPage(props: PageProps<"/admin/clients/[id]/menu">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();

  const { data: client } = await supabase.from("clients").select("id, name, slug").eq("id", id).maybeSingle();
  if (!client) notFound();

  const { data: menu } = await supabase
    .from("menus")
    .select("title, is_published, menu_categories(name, sort_order, menu_items(name, description, price, options, is_available, sort_order))")
    .eq("client_id", id)
    .maybeSingle();

  const draft: MenuDraft = {
    title: menu?.title ?? "",
    categories: (menu?.menu_categories ?? [])
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => ({
        name: c.name,
        items: c.menu_items
          .sort((a, b) => a.sort_order - b.sort_order)
          .map((i) => ({
            name: i.name,
            description: i.description ?? "",
            price: i.price,
            options: i.options ?? [],
            is_available: i.is_available,
          })),
      })),
  };

  const publicUrl = `${await siteUrl()}/m/${client.slug}`;
  const qrDataUrl = await QRCode.toDataURL(publicUrl, { width: 1024, margin: 2, errorCorrectionLevel: "M" });

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/admin/clients/${id}`} className="text-sm text-slate-500 hover:text-slate-900">
          ← {client.name}
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">Menu điện tử</h1>
      </div>
      <MenuEditor
        clientId={id}
        slug={client.slug}
        initialDraft={draft}
        initialPublished={menu?.is_published ?? false}
        publicUrl={publicUrl}
        qrDataUrl={qrDataUrl}
      />
    </div>
  );
}
