import type { Metadata } from "next";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { bankName, vietQrPayload } from "@/lib/vietqr";
import { MenuView, type PublicCategory } from "./MenuView";
import { PaymentButton } from "./PaymentButton";

// Always serve the latest prices.
export const dynamic = "force-dynamic";

const loadMenu = cache(async (slug: string) => {
  const supabase = await createClient();
  const { data: client } = await supabase
    .from("clients")
    .select("id, name, address, phone, zalo, map_url, logo_url, bank_bin, bank_account_no, bank_account_name")
    .eq("slug", slug)
    // RLS hides disabled shops from visitors only; owners and admins must get the same 404.
    .eq("is_disabled", false)
    .maybeSingle();
  if (!client) return null;

  // RLS only returns published menus to visitors; also filter explicitly so a signed-in admin previews the same thing.
  const { data: menu } = await supabase
    .from("menus")
    .select("title, menu_categories(name, sort_order, menu_items(name, description, price, options, is_available, sort_order))")
    .eq("client_id", client.id)
    .eq("is_published", true)
    .maybeSingle();
  if (!menu) return null;

  const categories: PublicCategory[] = menu.menu_categories
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((c) => ({
      name: c.name,
      items: c.menu_items
        .sort((a, b) => a.sort_order - b.sort_order)
        .map((i) => ({ name: i.name, description: i.description, price: i.price, options: i.options ?? [], available: i.is_available })),
    }));
  return { client, title: menu.title as string | null, categories };
});

export async function generateMetadata(props: PageProps<"/m/[slug]">): Promise<Metadata> {
  const data = await loadMenu((await props.params).slug);
  return { title: data ? `Menu · ${data.client.name}` : "Menu" };
}

export default async function PublicMenuPage(props: PageProps<"/m/[slug]">) {
  const data = await loadMenu((await props.params).slug);
  if (!data) notFound();
  const { client, title, categories } = data;
  const payment =
    client.bank_bin && client.bank_account_no
      ? {
          qrDataUrl: await QRCode.toDataURL(vietQrPayload({ bin: client.bank_bin, accountNo: client.bank_account_no }), { width: 600, margin: 2 }),
          bank: bankName(client.bank_bin),
          accountNo: client.bank_account_no as string,
          accountName: client.bank_account_name as string | null,
        }
      : null;

  return (
    <div className="mx-auto w-full max-w-lg flex-1 bg-white pb-12 shadow-sm">
      <header className="bg-gradient-to-br from-amber-500 to-orange-600 px-5 pt-8 pb-6 text-white">
        <h1 className="text-2xl font-bold">{client.name}</h1>
        {title && title !== client.name && <p className="mt-1 text-white/90">{title}</p>}
        {client.address && <p className="mt-2 text-sm text-white/80">{client.address}</p>}
        <div className="mt-3 flex flex-wrap gap-2 text-sm">
          {client.phone && (
            <a href={`tel:${client.phone}`} className="rounded-full bg-white/20 px-3 py-1">
              Gọi {client.phone}
            </a>
          )}
          {client.map_url && (
            <a href={client.map_url} target="_blank" rel="noreferrer" className="rounded-full bg-white/20 px-3 py-1">
              Chỉ đường
            </a>
          )}
        </div>
      </header>
      <MenuView categories={categories} />
      {payment && <PaymentButton {...payment} />}
    </div>
  );
}
