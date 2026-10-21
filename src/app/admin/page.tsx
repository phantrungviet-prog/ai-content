import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { CreateClientForm } from "./CreateClientForm";

export default async function AdminHome() {
  const { supabase } = await requireAdmin();
  const { data: clients } = await supabase
    .from("clients")
    .select("id, name, slug, type, menus(is_published)")
    .order("created_at", { ascending: false });

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <section>
        <h1 className="mb-4 text-2xl font-semibold">Khách hàng</h1>
        {!clients?.length ? (
          <p className="text-slate-500">Chưa có khách hàng nào. Tạo khách hàng đầu tiên ở bên phải.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {clients.map((c) => {
              // menus is one-to-one (unique client_id), so PostgREST returns an object rather than an array.
              const published = (Array.isArray(c.menus) ? c.menus[0] : c.menus)?.is_published;
              return (
                <li key={c.id}>
                  <Link href={`/admin/clients/${c.id}`} className="flex items-center justify-between px-5 py-4 hover:bg-slate-50">
                    <div>
                      <p className="font-medium">{c.name}</p>
                      <p className="text-sm text-slate-500">
                        {c.type === "shop" ? "Shop online" : "Quán ăn / nước"} · /{c.slug}
                      </p>
                    </div>
                    {published && <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700">Menu đang hiển thị</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      <aside>
        <CreateClientForm />
      </aside>
    </div>
  );
}
