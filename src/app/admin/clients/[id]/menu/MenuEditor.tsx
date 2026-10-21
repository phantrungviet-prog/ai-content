"use client";

import { useState, useTransition } from "react";
import { resizeImage } from "@/lib/image-resize";
import type { MenuCategoryDraft, MenuDraft, MenuItemDraft } from "@/lib/menu";
import { formatVnd, parseVndPrice } from "@/lib/price";
import { createClient } from "@/lib/supabase/client";
import { extractMenuAction, saveMenuAction } from "./actions";

type Props = {
  clientId: string;
  slug: string;
  initialDraft: MenuDraft;
  initialPublished: boolean;
  publicUrl: string;
  qrDataUrl: string;
};

const emptyItem = (): MenuItemDraft => ({ name: "", description: "", price: null, options: [], is_available: true });

function move<T>(list: T[], index: number, delta: number): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = [...list];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function MenuEditor({ clientId, slug, initialDraft, initialPublished, publicUrl, qrDataUrl }: Props) {
  const [draft, setDraft] = useState(initialDraft);
  const [published, setPublished] = useState(initialPublished);
  const [dirty, setDirty] = useState(false);
  const [previews, setPreviews] = useState<string[]>([]);
  const [status, setStatus] = useState<{ kind: "info" | "error" | "success"; text: string } | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [saving, startSaving] = useTransition();

  const update = (next: MenuDraft) => {
    setDraft(next);
    setDirty(true);
  };
  const updateCategory = (ci: number, patch: Partial<MenuCategoryDraft>) =>
    update({ ...draft, categories: draft.categories.map((c, i) => (i === ci ? { ...c, ...patch } : c)) });
  const updateItem = (ci: number, ii: number, patch: Partial<MenuItemDraft>) =>
    updateCategory(ci, { items: draft.categories[ci].items.map((it, i) => (i === ii ? { ...it, ...patch } : it)) });

  const itemCount = draft.categories.reduce((n, c) => n + c.items.length, 0);
  const needsReview = draft.categories.reduce(
    (n, c) => n + c.items.filter((it) => it.price == null && it.options.length === 0).length,
    0,
  );

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    if (files.length > 6) return setStatus({ kind: "error", text: "Tối đa 6 ảnh mỗi lần." });
    if (itemCount > 0 && !confirm("Menu hiện tại sẽ được thay bằng kết quả AI đọc từ ảnh mới. Tiếp tục?")) return;

    setExtracting(true);
    setStatus({ kind: "info", text: "Đang tải ảnh lên..." });
    try {
      const supabase = createClient();
      const blobs = await Promise.all(Array.from(files).map((f) => resizeImage(f, 2048)));
      setPreviews(blobs.map((b) => URL.createObjectURL(b)));

      const paths = await Promise.all(
        blobs.map(async (blob) => {
          const path = `${clientId}/menu/${crypto.randomUUID()}.jpg`;
          const { error } = await supabase.storage.from("originals").upload(path, blob, { contentType: "image/jpeg" });
          if (error) throw new Error(`Tải ảnh thất bại: ${error.message}`);
          return path;
        }),
      );

      setStatus({ kind: "info", text: "AI đang đọc menu, thường mất 10–30 giây..." });
      const result = await extractMenuAction(clientId, paths);
      if (!result.ok) return setStatus({ kind: "error", text: result.error });

      update({ ...result.data, title: result.data.title || draft.title });
      const found = result.data.categories.reduce((n, c) => n + c.items.length, 0);
      setStatus({ kind: "success", text: `Đã đọc ${found} món. Kiểm tra lại tên và giá rồi bấm Lưu.` });
    } catch (err) {
      setStatus({ kind: "error", text: err instanceof Error ? err.message : "Có lỗi xảy ra." });
    } finally {
      setExtracting(false);
    }
  }

  function save(publish: boolean) {
    startSaving(async () => {
      const result = await saveMenuAction(clientId, draft, publish);
      if (!result.ok) return setStatus({ kind: "error", text: result.error });
      setPublished(publish);
      setDirty(false);
      setStatus({ kind: "success", text: publish ? "Đã lưu và hiển thị menu." : "Đã lưu (menu đang ẩn)." });
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
      <div className="space-y-6">
        <section className="card space-y-3">
          <h2 className="font-semibold">1. Chụp / tải ảnh menu</h2>
          <p className="text-sm text-slate-500">Chụp thẳng, đủ sáng, rõ chữ. Menu nhiều trang thì chọn nhiều ảnh cùng lúc.</p>
          <label className={`btn-secondary cursor-pointer ${extracting ? "pointer-events-none opacity-50" : ""}`}>
            {extracting ? "Đang xử lý..." : "Chọn ảnh menu"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={extracting}
              onChange={(e) => {
                onFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
          {previews.length > 0 && (
            <div className="flex gap-2 overflow-x-auto">
              {previews.map((src) => (
                <a key={src} href={src} target="_blank" rel="noreferrer" className="shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local blob preview */}
                  <img src={src} alt="Ảnh menu gốc" className="h-40 rounded-lg ring-1 ring-slate-200" />
                </a>
              ))}
            </div>
          )}
        </section>

        <section className="card space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">2. Kiểm tra & chỉnh sửa</h2>
            <span className="text-sm text-slate-500">
              {draft.categories.length} danh mục · {itemCount} món
              {needsReview > 0 && <span className="ml-2 text-amber-600">· {needsReview} món chưa có giá</span>}
            </span>
          </div>

          <input
            value={draft.title}
            onChange={(e) => update({ ...draft, title: e.target.value })}
            placeholder="Tiêu đề menu (tùy chọn)"
            className="input"
          />

          {draft.categories.map((category, ci) => (
            <div key={ci} className="space-y-2 rounded-xl border border-slate-200 p-3">
              <div className="flex gap-2">
                <input
                  value={category.name}
                  onChange={(e) => updateCategory(ci, { name: e.target.value })}
                  placeholder="Tên danh mục"
                  className="input font-semibold"
                />
                <IconButton label="Lên" onClick={() => update({ ...draft, categories: move(draft.categories, ci, -1) })}>↑</IconButton>
                <IconButton label="Xuống" onClick={() => update({ ...draft, categories: move(draft.categories, ci, 1) })}>↓</IconButton>
                <IconButton
                  label="Xóa danh mục"
                  danger
                  onClick={() => {
                    if (category.items.length && !confirm(`Xóa danh mục "${category.name}" và ${category.items.length} món?`)) return;
                    update({ ...draft, categories: draft.categories.filter((_, i) => i !== ci) });
                  }}
                >
                  ✕
                </IconButton>
              </div>

              {category.items.map((item, ii) => (
                <ItemRow
                  key={ii}
                  item={item}
                  onChange={(patch) => updateItem(ci, ii, patch)}
                  onMove={(delta) => updateCategory(ci, { items: move(category.items, ii, delta) })}
                  onRemove={() => updateCategory(ci, { items: category.items.filter((_, i) => i !== ii) })}
                />
              ))}

              <button
                type="button"
                className="text-sm text-indigo-600 hover:underline"
                onClick={() => updateCategory(ci, { items: [...category.items, emptyItem()] })}
              >
                + Thêm món
              </button>
            </div>
          ))}

          <button
            type="button"
            className="btn-secondary"
            onClick={() => update({ ...draft, categories: [...draft.categories, { name: "", items: [emptyItem()] }] })}
          >
            + Thêm danh mục
          </button>
        </section>
      </div>

      <aside className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <section className="card space-y-3">
          <h2 className="font-semibold">3. Lưu & hiển thị</h2>
          <p className="text-sm">
            Trạng thái:{" "}
            {published ? <span className="font-medium text-emerald-600">Đang hiển thị</span> : <span className="font-medium text-slate-500">Đang ẩn</span>}
            {dirty && <span className="block text-amber-600">Có thay đổi chưa lưu</span>}
          </p>
          <button disabled={saving || extracting || itemCount === 0} onClick={() => save(true)} className="btn-primary w-full">
            {saving ? "Đang lưu..." : published ? "Lưu thay đổi" : "Lưu & hiển thị menu"}
          </button>
          <button disabled={saving || extracting} onClick={() => save(false)} className="btn-secondary w-full">
            {published ? "Ẩn menu" : "Lưu nháp"}
          </button>
          {status && (
            <p
              className={`text-sm ${
                status.kind === "error" ? "text-red-600" : status.kind === "success" ? "text-emerald-600" : "text-slate-600"
              }`}
            >
              {status.text}
            </p>
          )}
        </section>

        <section className="card space-y-3 text-center">
          <h2 className="font-semibold">Mã QR</h2>
          {/* eslint-disable-next-line @next/next/no-img-element -- data URL */}
          <img src={qrDataUrl} alt="Mã QR menu" className="mx-auto w-48" />
          <a href={publicUrl} target="_blank" rel="noreferrer" className="block break-all text-sm text-indigo-600 hover:underline">
            {publicUrl}
          </a>
          <a href={qrDataUrl} download={`qr-menu-${slug}.png`} className="btn-secondary w-full">
            Tải mã QR (PNG)
          </a>
          {!published && <p className="text-xs text-slate-500">Mã QR sẽ hoạt động sau khi menu được hiển thị.</p>}
        </section>
      </aside>
    </div>
  );
}

function ItemRow({
  item,
  onChange,
  onMove,
  onRemove,
}: {
  item: MenuItemDraft;
  onChange: (patch: Partial<MenuItemDraft>) => void;
  onMove: (delta: number) => void;
  onRemove: () => void;
}) {
  const missingPrice = item.price == null && item.options.length === 0;
  return (
    <div className={`space-y-2 rounded-lg p-2 ${missingPrice ? "bg-amber-50" : "bg-slate-50"}`}>
      <div className="flex flex-wrap gap-2 sm:flex-nowrap">
        <input value={item.name} onChange={(e) => onChange({ name: e.target.value })} placeholder="Tên món" className="input sm:flex-1" />
        <PriceInput value={item.price} onChange={(price) => onChange({ price })} className="input w-32" />
        <label className="flex items-center gap-1 text-xs whitespace-nowrap text-slate-600">
          <input type="checkbox" checked={item.is_available} onChange={(e) => onChange({ is_available: e.target.checked })} />
          Còn món
        </label>
        <IconButton label="Lên" onClick={() => onMove(-1)}>↑</IconButton>
        <IconButton label="Xuống" onClick={() => onMove(1)}>↓</IconButton>
        <IconButton label="Xóa món" danger onClick={onRemove}>✕</IconButton>
      </div>
      <input
        value={item.description}
        onChange={(e) => onChange({ description: e.target.value })}
        placeholder="Mô tả (tùy chọn)"
        className="input text-xs"
      />
      {item.options.map((opt, oi) => (
        <div key={oi} className="flex gap-2 pl-4">
          <input
            value={opt.label}
            onChange={(e) => onChange({ options: item.options.map((o, i) => (i === oi ? { ...o, label: e.target.value } : o)) })}
            placeholder="Size / lựa chọn"
            className="input flex-1 text-xs"
          />
          <PriceInput
            value={opt.price}
            onChange={(price) => onChange({ options: item.options.map((o, i) => (i === oi ? { ...o, price } : o)) })}
            className="input w-32 text-xs"
          />
          <IconButton label="Xóa lựa chọn" danger onClick={() => onChange({ options: item.options.filter((_, i) => i !== oi) })}>
            ✕
          </IconButton>
        </div>
      ))}
      <button
        type="button"
        className="pl-4 text-xs text-indigo-600 hover:underline"
        onClick={() => onChange({ options: [...item.options, { label: "", price: null }] })}
      >
        + Thêm size / lựa chọn
      </button>
    </div>
  );
}

// Accepts the shorthands people type ("35k", "35.000") and stores whole VND on blur.
function PriceInput({ value, onChange, className }: { value: number | null; onChange: (v: number | null) => void; className: string }) {
  const [text, setText] = useState<string | null>(null);
  return (
    <input
      value={text ?? formatVnd(value)}
      onFocus={() => setText(value == null ? "" : String(value))}
      onChange={(e) => setText(e.target.value)}
      onBlur={() => {
        onChange(parseVndPrice(text));
        setText(null);
      }}
      placeholder="Giá"
      inputMode="numeric"
      className={className}
    />
  );
}

function IconButton({
  label,
  onClick,
  danger,
  children,
}: {
  label: string;
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`shrink-0 rounded-lg px-2.5 text-sm text-slate-500 hover:bg-slate-200 ${danger ? "hover:text-red-600" : ""}`}
    >
      {children}
    </button>
  );
}
