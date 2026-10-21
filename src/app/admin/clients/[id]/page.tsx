import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { ClientInfoForm } from "./ClientInfoForm";

export default async function ClientPage(props: PageProps<"/admin/clients/[id]">) {
  const { id } = await props.params;
  const { supabase } = await requireAdmin();
  const { data: client } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();
  if (!client) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Link href="/admin" className="text-sm text-slate-500 hover:text-slate-900">
          ← Khách hàng
        </Link>
        <h1 className="mt-1 text-2xl font-semibold">{client.name}</h1>
        <p className="text-sm text-slate-500">Đường dẫn cố định: /{client.slug}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <ToolCard href={`/admin/clients/${id}/menu`} title="Menu điện tử QR" desc="Chụp menu giấy → menu online + mã QR" />
        <ToolCard title="Ảnh sản phẩm Studio" desc="Xóa phông, ghép nền đẹp" soon />
        <ToolCard title="Viết bài AI" desc="Mô tả, caption Facebook / TikTok" soon />
      </div>

      <ClientInfoForm client={client} />
    </div>
  );
}

function ToolCard({ href, title, desc, soon }: { href?: string; title: string; desc: string; soon?: boolean }) {
  const body = (
    <>
      <p className="font-medium">
        {title} {soon && <span className="ml-1 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">Sắp có</span>}
      </p>
      <p className="mt-1 text-sm text-slate-500">{desc}</p>
    </>
  );
  return href ? (
    <Link href={href} className="card block transition hover:ring-indigo-300">
      {body}
    </Link>
  ) : (
    <div className="card opacity-60">{body}</div>
  );
}
