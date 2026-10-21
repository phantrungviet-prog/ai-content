"use client";

import { useActionState } from "react";
import { createClientAction, type FormState } from "./actions";

export function CreateClientForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(createClientAction, {});
  return (
    <form action={action} className="card space-y-3">
      <h2 className="font-semibold">Thêm shop / quán mới</h2>
      <input name="name" required placeholder="Tên, ví dụ: Cà phê Mộc" className="input" />
      <input name="slug" placeholder="Đường dẫn (tự tạo nếu để trống)" className="input" />
      <select name="type" className="input" defaultValue="restaurant">
        <option value="restaurant">Quán ăn / quán nước</option>
        <option value="shop">Shop bán hàng online</option>
      </select>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button disabled={pending} className="btn-primary w-full">
        {pending ? "Đang tạo..." : "Tạo"}
      </button>
    </form>
  );
}
