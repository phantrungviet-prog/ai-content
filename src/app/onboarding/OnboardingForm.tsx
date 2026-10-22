"use client";

import { useActionState, useState } from "react";
import type { FormState } from "@/app/admin/actions";
import { slugify } from "@/lib/slug";
import { createOwnShopAction } from "./actions";

export function OnboardingForm({ siteUrl }: { siteUrl: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createOwnShopAction, {});
  const [name, setName] = useState("");
  // Follows the name until the user edits the slug themselves.
  const [customSlug, setCustomSlug] = useState<string | null>(null);
  const slugInput = customSlug ?? slugify(name);
  const slug = slugify(slugInput);

  return (
    <form action={action} className="space-y-4">
      <label className="block space-y-1">
        <span className="text-sm font-medium">Tên cửa hàng</span>
        <input name="name" required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ví dụ: Cà phê Mộc" className="input" />
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Loại hình</span>
        <select name="type" className="input" defaultValue="restaurant">
          <option value="restaurant">Quán ăn / quán nước</option>
          <option value="shop">Shop bán hàng</option>
        </select>
      </label>
      <label className="block space-y-1">
        <span className="text-sm font-medium">Đường dẫn</span>
        <input
          name="slug"
          required
          maxLength={40}
          value={slugInput}
          // Light cleanup while typing; slugify() would eat a trailing "-" before the next word is typed.
          onChange={(e) => setCustomSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
          placeholder="ca-phe-moc"
          className="input"
        />
        <span className="block break-all text-xs text-slate-500">
          Menu của bạn: {siteUrl}/m/{slug || "..."}
        </span>
        <span className="block text-xs text-amber-700">Đường dẫn được in trong mã QR nên không đổi được sau khi tạo.</span>
      </label>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Đang tạo..." : "Tạo cửa hàng"}
      </button>
    </form>
  );
}
