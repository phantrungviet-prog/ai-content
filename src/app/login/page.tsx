"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // Set by /auth/confirm when an email link is invalid, expired or already used.
  const badLink = useSearchParams().get("error") === "link";
  const [error, setError] = useState(badLink ? "Link trong email đã hết hạn hoặc đã được dùng. Hãy đăng nhập, hoặc yêu cầu link mới." : "");
  const [unconfirmedEmail, setUnconfirmedEmail] = useState("");
  const [notice, setNotice] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    setPending(true);
    setError("");
    setNotice("");
    setUnconfirmedEmail("");
    const { error } = await createClient().auth.signInWithPassword({ email, password: String(form.get("password")) });
    setPending(false);
    if (error) {
      if (error.code === "invalid_credentials") return setError("Sai email hoặc mật khẩu.");
      if (error.code === "email_not_confirmed") {
        setUnconfirmedEmail(email);
        return setError("Email chưa được xác nhận. Mở email xác nhận chúng tôi đã gửi và bấm vào link.");
      }
      return setError(`Không đăng nhập được: ${error.message}`);
    }
    router.replace("/admin");
    router.refresh();
  }

  async function resendConfirmation() {
    setPending(true);
    const { error } = await createClient().auth.resend({ type: "signup", email: unconfirmedEmail });
    setPending(false);
    if (error) return setError(error.code === "over_email_send_rate_limit" ? "Vừa gửi rồi, đợi ít phút rồi thử lại." : `Không gửi được email: ${error.message}`);
    setError("");
    setUnconfirmedEmail("");
    setNotice("Đã gửi lại email xác nhận. Nhớ xem cả thư mục Spam.");
  }

  return (
    <AuthCard
      title="Đăng nhập"
      footer={
        <>
          Chưa có tài khoản?{" "}
          <Link href="/signup" className="text-indigo-700 hover:underline">
            Đăng ký miễn phí
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
        <input name="password" type="password" required placeholder="Mật khẩu" className="input" autoComplete="current-password" />
        {error && <p className="text-sm text-red-600">{error}</p>}
        {unconfirmedEmail && (
          <button type="button" onClick={resendConfirmation} disabled={pending} className="text-sm text-indigo-700 hover:underline">
            Gửi lại email xác nhận
          </button>
        )}
        {notice && <p className="text-sm text-emerald-700">{notice}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Đang xử lý..." : "Đăng nhập"}
        </button>
        <Link href="/forgot-password" className="block text-center text-sm text-slate-500 hover:text-slate-900">
          Quên mật khẩu?
        </Link>
      </form>
    </AuthCard>
  );
}
