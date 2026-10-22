import Link from "next/link";

// Centered card shared by login, signup, password reset and onboarding.
export function AuthCard({ title, children, footer }: { title: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4">
      <Link href="/" className="font-semibold text-indigo-700">
        AI Content Studio
      </Link>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">{title}</h1>
        {children}
      </div>
      {footer && <div className="text-center text-sm text-slate-500">{footer}</div>}
    </main>
  );
}
