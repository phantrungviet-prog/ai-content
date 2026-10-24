import Link from "next/link";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { setClientDisabledAction } from "./actions";
import { CreateClientForm } from "./CreateClientForm";

type AdminClientRow = {
  id: string;
  name: string;
  slug: string;
  type: string;
  is_disabled: boolean;
  owner_email: string | null;
  menu_published: boolean;
  ai_today: number;
};

export default async function AdminHome() {
  const { supabase, user, isAdmin } = await requireUser();
  if (!isAdmin) {
    // One account = one shop: owners go straight to it, new accounts create it first.
    const { data: own } = await supabase.from("clients").select("id").eq("owner_id", user.id).maybeSingle();
    redirect(own ? `/admin/clients/${own.id}` : "/onboarding");
  }

  // security definer: also reads owners' emails from auth.users, and refuses anyone who is not an admin.
  const { data, error } = await supabase.rpc("admin_list_clients");
  if (error) throw new Error(`admin_list_clients failed: ${error.message}`);
  const clients = (data ?? []) as AdminClientRow[];
  const aiToday = clients.reduce((sum, c) => sum + c.ai_today, 0);
  const selfServe = clients.filter((c) => c.owner_email).length;

  return (
    <div className="grid gap-8 md:grid-cols-[1fr_320px]">
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-semibold">Khách hàng</h1>
          <p className="text-sm text-slate-500">
            {clients.length} shop · {selfServe} tự đăng ký · {aiToday} lượt AI hôm nay
          </p>
        </div>
        {!clients.length ? (
          <p className="text-slate-500">Chưa có khách hàng nào. Tạo khách hàng đầu tiên ở bên phải.</p>
        ) : (
          <ul className="divide-y divide-slate-200 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {clients.map((c) => (
              <li key={c.id} className={`flex items-center gap-3 pr-4 ${c.is_disabled ? "bg-red-50/50" : ""}`}>
                <Link href={`/admin/clients/${c.id}`} className="min-w-0 flex-1 px-5 py-4 hover:bg-slate-50">
                  <p className="font-medium">{c.name}</p>
                  <p className="truncate text-sm text-slate-500">
                    {c.type === "shop" ? "Shop online" : "Quán ăn / nước"} · /{c.slug} · {c.owner_email ?? "Bạn quản lý"}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-xs">
                    {c.is_disabled && <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-red-700">Đã khóa</span>}
                    {c.menu_published && <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-emerald-700">Menu đang hiển thị</span>}
                    {c.ai_today > 0 && <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-indigo-700">{c.ai_today} lượt AI hôm nay</span>}
                  </div>
                </Link>
                <form action={setClientDisabledAction.bind(null, c.id, !c.is_disabled)}>
                  <button className={c.is_disabled ? "btn-secondary text-sm" : "text-sm text-slate-400 hover:text-red-600"}>
                    {c.is_disabled ? "Mở khóa" : "Khóa"}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>
      <aside>
        <CreateClientForm />
      </aside>
    </div>
  );
}
