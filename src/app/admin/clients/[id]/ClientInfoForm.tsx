"use client";

import { useActionState } from "react";
import { BANKS } from "@/lib/vietqr";
import type { FormState } from "@/app/admin/actions";
import { updateClientAction } from "./actions";

export type ClientInfo = {
  id: string;
  name: string;
  type: string;
  phone: string | null;
  zalo: string | null;
  address: string | null;
  map_url: string | null;
  intro: string | null;
  bank_bin: string | null;
  bank_account_no: string | null;
  bank_account_name: string | null;
};

export function ClientInfoForm({ client }: { client: ClientInfo }) {
  const [state, action, pending] = useActionState<FormState, FormData>(updateClientAction.bind(null, client.id), {});
  return (
    <form action={action} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Thông tin</h2>
      <Field label="Tên">
        <input name="name" defaultValue={client.name} required className="input" />
      </Field>
      <Field label="Loại">
        <select name="type" defaultValue={client.type} className="input">
          <option value="restaurant">Quán ăn / quán nước</option>
          <option value="shop">Shop bán hàng online</option>
        </select>
      </Field>
      <Field label="Số điện thoại">
        <input name="phone" defaultValue={client.phone ?? ""} className="input" />
      </Field>
      <Field label="Zalo (số hoặc link)">
        <input name="zalo" defaultValue={client.zalo ?? ""} className="input" />
      </Field>
      <Field label="Địa chỉ">
        <input name="address" defaultValue={client.address ?? ""} className="input" />
      </Field>
      <Field label="Link Google Maps">
        <input name="map_url" defaultValue={client.map_url ?? ""} className="input" />
      </Field>
      <div className="sm:col-span-2">
        <Field label="Giới thiệu ngắn">
          <textarea name="intro" defaultValue={client.intro ?? ""} rows={3} className="input" />
        </Field>
      </div>
      <h3 className="pt-2 font-medium sm:col-span-2">Nhận chuyển khoản (VietQR trên menu)</h3>
      <Field label="Ngân hàng">
        <select name="bank_bin" defaultValue={client.bank_bin ?? ""} className="input">
          <option value="">Không dùng</option>
          {BANKS.map((b) => (
            <option key={b.bin} value={b.bin}>
              {b.name}
            </option>
          ))}
        </select>
      </Field>
      <Field label="Số tài khoản">
        <input name="bank_account_no" defaultValue={client.bank_account_no ?? ""} inputMode="numeric" className="input" />
      </Field>
      <Field label="Tên chủ tài khoản">
        <input name="bank_account_name" defaultValue={client.bank_account_name ?? ""} placeholder="NGUYEN VAN A" className="input" />
      </Field>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "Đang lưu..." : "Lưu"}
        </button>
        {state.ok && <span className="text-sm text-emerald-600">Đã lưu</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="text-slate-600">{label}</span>
      {children}
    </label>
  );
}
