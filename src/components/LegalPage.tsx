import Link from "next/link";

// Contact address shown on the legal pages; set NEXT_PUBLIC_CONTACT_EMAIL on Vercel.
export const CONTACT_EMAIL = process.env.NEXT_PUBLIC_CONTACT_EMAIL;

export function ContactLine() {
  return CONTACT_EMAIL ? (
    <>
      email{" "}
      <a href={`mailto:${CONTACT_EMAIL}`} className="text-indigo-700 underline">
        {CONTACT_EMAIL}
      </a>
    </>
  ) : (
    <>email của quản trị viên</>
  );
}

export function LegalPage({ title, updated, children }: { title: string; updated: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 bg-white">
      <header className="border-b border-slate-100">
        <div className="mx-auto max-w-3xl px-5 py-4">
          <Link href="/" className="font-semibold text-indigo-700">
            AI Content Studio
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm text-slate-500">Cập nhật lần cuối: {updated}</p>
        <div className="mt-8 space-y-6 leading-relaxed text-slate-700 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_li]:ml-5 [&_li]:list-disc [&_ul]:space-y-1.5">
          {children}
        </div>
      </main>
      <footer className="border-t border-slate-100 py-6 text-center text-sm text-slate-500">
        <Link href="/terms" className="hover:text-slate-900">
          Điều khoản sử dụng
        </Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-slate-900">
          Chính sách bảo mật
        </Link>
      </footer>
    </div>
  );
}
