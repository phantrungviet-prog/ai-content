"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const email = String(new FormData(event.currentTarget).get("email")).trim();
    setPending(true);
    setError("");
    // The link in the email comes from the "Reset password" template and points to /auth/confirm.
    const { error } = await createClient().auth.resetPasswordForEmail(email);
    setPending(false);
    if (error) {
      if (error.code === "over_email_send_rate_limit") return setError("Bạn vừa yêu cầu rồi, đợi ít phút rồi thử lại.");
      return setError(`Không gửi được email: ${error.message}`);
    }
    setSent(true);
  }

  return (
    <AuthCard
      title="Quên mật khẩu"
      footer={
        <Link href="/login" className="text-indigo-700 hover:underline">
          ← Quay lại đăng nhập
        </Link>
      }
    >
      {sent ? (
        <p className="text-sm text-slate-600">
          Nếu email này có tài khoản, bạn sẽ nhận được link đặt lại mật khẩu trong vài phút. Nhớ xem cả thư mục Spam.
        </p>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <p className="text-sm text-slate-600">Nhập email đã đăng ký, chúng tôi sẽ gửi link để đặt mật khẩu mới.</p>
          <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <button disabled={pending} className="btn-primary w-full">
            {pending ? "Đang gửi..." : "Gửi link đặt lại mật khẩu"}
          </button>
        </form>
      )}
    </AuthCard>
  );
}
