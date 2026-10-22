"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true);
    setError("");
    const { error } = await createClient().auth.signInWithPassword({
      email: String(form.get("email")),
      password: String(form.get("password")),
    });
    setPending(false);
    if (error) {
      if (error.code === "invalid_credentials") return setError("Sai email hoặc mật khẩu.");
      if (error.code === "email_not_confirmed") return setError("Email chưa được xác nhận. Trong Supabase, xác nhận user hoặc tạo lại với \"Auto Confirm User\".");
      return setError(`Không đăng nhập được: ${error.message}`);
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <main className="flex flex-1 items-center justify-center p-4">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <h1 className="text-xl font-semibold">Đăng nhập</h1>
        <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
        <input name="password" type="password" required placeholder="Mật khẩu" className="input" autoComplete="current-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Đang đăng nhập..." : "Đăng nhập"}
        </button>
      </form>
    </main>
  );
}
