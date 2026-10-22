"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

// Reached from the reset email via /auth/confirm, which has already signed the user in.
export default function ResetPasswordPage() {
  const router = useRouter();
  const [error, setError] = useState<React.ReactNode>("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Mật khẩu cần ít nhất 8 ký tự.");
    if (password !== form.get("confirm")) return setError("Hai mật khẩu không khớp.");

    setPending(true);
    setError("");
    const { error } = await createClient().auth.updateUser({ password });
    setPending(false);
    if (error) {
      if (error.code === "same_password") return setError("Mật khẩu mới phải khác mật khẩu cũ.");
      if (error.code === "weak_password") return setError("Mật khẩu quá yếu, hãy dùng mật khẩu dài hơn hoặc khó đoán hơn.");
      if (error.code === "session_not_found" || error.name === "AuthSessionMissingError") {
        return setError(
          <>
            Link đã hết hạn.{" "}
            <Link href="/forgot-password" className="underline">
              Gửi lại link
            </Link>
          </>,
        );
      }
      return setError(`Không đổi được mật khẩu: ${error.message}`);
    }
    router.replace("/admin");
    router.refresh();
  }

  return (
    <AuthCard title="Đặt mật khẩu mới">
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="password" type="password" required minLength={8} placeholder="Mật khẩu mới (ít nhất 8 ký tự)" className="input" autoComplete="new-password" />
        <input name="confirm" type="password" required placeholder="Nhập lại mật khẩu mới" className="input" autoComplete="new-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Đang lưu..." : "Lưu mật khẩu"}
        </button>
      </form>
    </AuthCard>
  );
}
