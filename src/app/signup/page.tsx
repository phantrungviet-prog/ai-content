"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { AuthCard } from "@/components/AuthCard";
import { createClient } from "@/lib/supabase/client";

export default function SignupPage() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [sentTo, setSentTo] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const email = String(form.get("email")).trim();
    const password = String(form.get("password"));
    if (password.length < 8) return setError("Mật khẩu cần ít nhất 8 ký tự.");
    if (password !== form.get("confirm")) return setError("Hai mật khẩu không khớp.");

    setPending(true);
    setError("");
    const { data, error } = await createClient().auth.signUp({ email, password });
    setPending(false);
    if (error) {
      if (error.code === "weak_password") return setError("Mật khẩu quá yếu, hãy dùng mật khẩu dài hơn hoặc khó đoán hơn.");
      if (error.code === "over_email_send_rate_limit") return setError("Hệ thống đang gửi quá nhiều email, thử lại sau ít phút.");
      if (error.code === "signup_disabled") return setError("Hiện chưa mở đăng ký.");
      return setError(`Không đăng ký được: ${error.message}`);
    }
    // Without email confirmation Supabase signs the user in right away.
    if (data.session) {
      router.replace("/onboarding");
      return router.refresh();
    }
    // For an email that already has an account Supabase also lands here, so this reveals nothing.
    setSentTo(email);
  }

  if (sentTo) {
    return (
      <AuthCard title="Kiểm tra email của bạn">
        <p className="text-sm text-slate-600">
          Chúng tôi đã gửi link xác nhận tới <strong>{sentTo}</strong>. Bấm vào link đó (mở trên điện thoại cũng được) để tạo cửa hàng.
        </p>
        <p className="text-sm text-slate-500">Không thấy email? Xem thư mục Spam hoặc Quảng cáo.</p>
      </AuthCard>
    );
  }

  return (
    <AuthCard
      title="Tạo tài khoản miễn phí"
      footer={
        <>
          Đã có tài khoản?{" "}
          <Link href="/login" className="text-indigo-700 hover:underline">
            Đăng nhập
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="Email" className="input" autoComplete="email" />
        <input name="password" type="password" required minLength={8} placeholder="Mật khẩu (ít nhất 8 ký tự)" className="input" autoComplete="new-password" />
        <input name="confirm" type="password" required placeholder="Nhập lại mật khẩu" className="input" autoComplete="new-password" />
        <label className="flex items-start gap-2 text-sm text-slate-600">
          <input name="terms" type="checkbox" required className="mt-1" />
          <span>
            Tôi đồng ý với{" "}
            <Link href="/terms" target="_blank" className="text-indigo-700 hover:underline">
              Điều khoản sử dụng
            </Link>{" "}
            và{" "}
            <Link href="/privacy" target="_blank" className="text-indigo-700 hover:underline">
              Chính sách bảo mật
            </Link>
          </span>
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button disabled={pending} className="btn-primary w-full">
          {pending ? "Đang tạo tài khoản..." : "Đăng ký"}
        </button>
      </form>
    </AuthCard>
  );
}
