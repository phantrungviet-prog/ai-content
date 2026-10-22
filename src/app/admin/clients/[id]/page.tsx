import Link from "next/link";
import { notFound } from "next/navigation";
import { requireClientAccess } from "@/lib/auth";
import { ClientInfoForm } from "./ClientInfoForm";

export default async function ClientPage(props: PageProps<"/admin/clients/[id]">) {
  const { id } = await props.params;
  const { supabase, isAdmin } = await requireClientAccess(id);
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        {/* Owners have just this one shop, so only the super admin has a list to go back to. */}
        {isAdmin && (
          <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
            ← Khách hàng
          </Link>
        )}
        <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
        <p className="text-sm text-slate-500">Đường dẫn cố định: /{client.slug}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ToolCard href={`/admin/clients/${id}/menu`} title="Menu điện tử QR" desc="Chụp menu giấy → menu online + mã QR" />
        <ToolCard href={`/admin/clients/${id}/products`} title="Sản phẩm · Ảnh Studio · Viết bài" desc="Ghép nền đẹp, viết caption Facebook / TikTok" />
        <ToolCard href={`/s/${client.slug}`} title="Website" desc={`Trang giới thiệu /s/${client.slug}`} external />
      </div>

      <ClientInfoForm client={client} />
    </div>
  );
}

function ToolCard({ href, title, desc, external }: { href: string; title: string; desc: string; external?: boolean }) {
  const body = (
    <>
      <p className="font-medium">
        {title} {external && <span className="text-slate-400">↗</span>}
      </p>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </>
  );
  return (
    <Link href={href} target={external ? "_blank" : undefined} className="card block transition hover:ring-indigo-300">
      {body}
    </Link>
  );
}
