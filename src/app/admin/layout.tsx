import Link from "next/link";
import { signOutAction } from "./actions";

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link href="/admin" className="font-semibold text-indigo-700">
            AI Content Studio
          </Link>
          <form action={signOutAction}>
            <button className="text-sm text-slate-500 hover:text-slate-900">Đăng xuất</button>
          </form>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
