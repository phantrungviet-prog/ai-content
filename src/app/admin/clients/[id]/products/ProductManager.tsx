"use client";

import { useState, useTransition } from "react";
import { ASPECT_RATIOS, PLATFORMS, STUDIO_PRESETS, TONES, type AspectRatio, type Platform, type StudioPreset, type Tone } from "@/lib/ai-options";
import { resizeImage } from "@/lib/image-resize";
import { formatVnd } from "@/lib/price";
import { createClient } from "@/lib/supabase/client";
import {
  approveStudioImageAction,
  createProductAction,
  deleteProductAction,
  generatePostAction,
  generateStudioImageAction,
  removeStudioImageAction,
  saveDescriptionAction,
} from "./actions";

export type ProductView = {
  id: string;
  name: string;
  price: number | null;
  description: string;
  originalUrl: string | null;
  studioImages: { path: string; url: string }[];
};

export function ProductManager({ clientId, products }: { clientId: string; products: ProductView[] }) {
  return (
    <div className="space-y-6">
      <NewProductForm clientId={clientId} />
      {products.length === 0 ? (
        <p className="text-slate-500">Chưa có sản phẩm. Thêm sản phẩm đầu tiên ở trên.</p>
      ) : (
        products.map((p) => <ProductCard key={p.id} product={p} />)
      )}
    </div>
  );
}

function NewProductForm({ clientId }: { clientId: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formEl = event.currentTarget;
    const form = new FormData(formEl);
    const file = form.get("image") as File | null;
    setPending(true);
    setError("");
    try {
      let imagePath: string | null = null;
      if (file && file.size > 0) {
        const blob = await resizeImage(file, 2048);
        imagePath = `${clientId}/products/${crypto.randomUUID()}.jpg`;
        const { error } = await createClient().storage.from("originals").upload(imagePath, blob, { contentType: "image/jpeg" });
        if (error) throw new Error(`Tải ảnh thất bại: ${error.message}`);
      }
      const result = await createProductAction(clientId, {
        name: String(form.get("name") ?? ""),
        price: String(form.get("price") ?? ""),
        description: String(form.get("description") ?? ""),
        imagePath,
      });
      if (!result.ok) throw new Error(result.error);
      formEl.reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Có lỗi xảy ra.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="card grid gap-3 sm:grid-cols-2">
      <h2 className="font-semibold sm:col-span-2">Thêm sản phẩm</h2>
      <input name="name" required placeholder="Tên sản phẩm, ví dụ: Cơm tấm sườn bì" className="input" />
      <input name="price" placeholder="Giá, ví dụ: 45k" className="input" />
      <textarea
        name="description"
        rows={2}
        placeholder="Ghi chú cho AI (chất liệu, hương vị, điểm nổi bật...)"
        className="input sm:col-span-2"
      />
      <label className="text-sm sm:col-span-2">
        <span className="mb-1 block text-slate-600">Ảnh chụp sản phẩm (chụp rõ, đủ sáng, thấy toàn bộ sản phẩm)</span>
        <input name="image" type="file" accept="image/*" className="text-sm" />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button disabled={pending} className="btn-primary">
          {pending ? "Đang lưu..." : "Thêm sản phẩm"}
        </button>
        {error && <span className="text-sm text-red-600">{error}</span>}
      </div>
    </form>
  );
}

function ProductCard({ product }: { product: ProductView }) {
  const [deleting, startDelete] = useTransition();
  return (
    <article className="card space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">{product.name}</h2>
          {product.price != null && <p className="text-sm text-slate-500">{formatVnd(product.price)}</p>}
        </div>
        <button
          disabled={deleting}
          onClick={() => {
            if (!confirm(`Xóa sản phẩm "${product.name}" và toàn bộ ảnh?`)) return;
            startDelete(async () => {
              const result = await deleteProductAction(product.id);
              if (!result.ok) alert(result.error);
            });
          }}
          className="text-sm text-slate-400 hover:text-red-600"
        >
          {deleting ? "Đang xóa..." : "Xóa"}
        </button>
      </header>
      <StudioSection product={product} />
      <PostSection product={product} />
    </article>
  );
}

function StudioSection({ product }: { product: ProductView }) {
  const [preset, setPreset] = useState<StudioPreset>("white");
  const [ratio, setRatio] = useState<AspectRatio>("1:1");
  const [candidates, setCandidates] = useState<{ path: string; url: string }[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function run(key: string, task: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(key);
    setError("");
    const result = await task();
    if (!result.ok) setError(result.error ?? "Có lỗi xảy ra.");
    setBusy(null);
  }

  if (!product.originalUrl) {
    return <p className="text-sm text-slate-500">Sản phẩm chưa có ảnh gốc nên chưa tạo được ảnh Studio.</p>;
  }

  return (
    <section className="space-y-3">
      <h3 className="font-medium">Ảnh Studio</h3>
      <div className="flex flex-wrap items-end gap-2">
        <select value={preset} onChange={(e) => setPreset(e.target.value as StudioPreset)} className="input w-auto">
          {Object.entries(STUDIO_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="input w-auto">
          {ASPECT_RATIOS.map((r) => (
            <option key={r} value={r}>
              {r === "1:1" ? "Vuông 1:1" : r === "3:4" ? "Dọc 3:4 (Facebook)" : "Dọc 9:16 (TikTok/Story)"}
            </option>
          ))}
        </select>
        <button
          disabled={busy !== null}
          className="btn-primary"
          onClick={() =>
            run("generate", async () => {
              const result = await generateStudioImageAction(product.id, preset, ratio);
              if (result.ok) setCandidates((c) => [result.data, ...c]);
              return result;
            })
          }
        >
          {busy === "generate" ? "AI đang tạo ảnh (~20 giây)..." : "Tạo ảnh"}
        </button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Figure url={product.originalUrl} caption="Ảnh gốc" />

        {candidates.map((c) => (
          <Figure key={c.path} url={c.url} caption="Ảnh mới: kiểm tra sản phẩm có bị AI vẽ sai không" highlight>
            <button
              disabled={busy !== null}
              className="btn-primary px-3 py-1 text-xs"
              onClick={() =>
                run(c.path, async () => {
                  const result = await approveStudioImageAction(product.id, c.path);
                  if (result.ok) setCandidates((list) => list.filter((x) => x.path !== c.path));
                  return result;
                })
              }
            >
              Dùng ảnh này
            </button>
            <button
              disabled={busy !== null}
              className="btn-secondary px-3 py-1 text-xs"
              onClick={() =>
                run(c.path, async () => {
                  const result = await removeStudioImageAction(product.id, c.path);
                  if (result.ok) setCandidates((list) => list.filter((x) => x.path !== c.path));
                  return result;
                })
              }
            >
              Bỏ
            </button>
          </Figure>
        ))}

        {product.studioImages.map((img) => (
          <Figure key={img.path} url={img.url} caption="Đã duyệt">
            <button className="btn-secondary px-3 py-1 text-xs" onClick={() => download(img.url, `${product.name}.png`)}>
              Tải về
            </button>
            <button
              disabled={busy !== null}
              className="px-2 text-xs text-slate-400 hover:text-red-600"
              onClick={() => {
                if (confirm("Xóa ảnh này?")) run(img.path, () => removeStudioImageAction(product.id, img.path));
              }}
            >
              Xóa
            </button>
          </Figure>
        ))}
      </div>
    </section>
  );
}

function Figure({ url, caption, highlight, children }: { url: string; caption: string; highlight?: boolean; children?: React.ReactNode }) {
  return (
    <figure className={`space-y-2 rounded-xl p-2 ${highlight ? "bg-amber-50 ring-2 ring-amber-300" : "bg-slate-50"}`}>
      <a href={url} target="_blank" rel="noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL */}
        <img src={url} alt={caption} className="aspect-square w-full rounded-lg object-contain" />
      </a>
      <figcaption className="text-xs text-slate-600">{caption}</figcaption>
      {children && <div className="flex flex-wrap gap-2">{children}</div>}
    </figure>
  );
}

// Storage URLs are cross-origin, where <a download> is ignored, so fetch the file first.
async function download(url: string, filename: string) {
  const blob = await (await fetch(url)).blob();
  const href = URL.createObjectURL(blob);
  const a = Object.assign(document.createElement("a"), { href, download: filename });
  a.click();
  URL.revokeObjectURL(href);
}

function PostSection({ product }: { product: ProductView }) {
  const [platform, setPlatform] = useState<Platform>("facebook");
  const [tone, setTone] = useState<Tone>("friendly");
  const [text, setText] = useState("");
  const [resultPlatform, setResultPlatform] = useState<Platform | null>(null);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<{ kind: "error" | "success"; text: string } | null>(null);

  function generate() {
    setMessage(null);
    startTransition(async () => {
      const result = await generatePostAction(product.id, platform, tone);
      if (!result.ok) return setMessage({ kind: "error", text: result.error });
      const { body, hashtags, video_idea } = result.data;
      setText([body, hashtags.join(" "), video_idea && `🎬 Gợi ý quay video:\n${video_idea}`].filter(Boolean).join("\n\n"));
      setResultPlatform(platform);
    });
  }

  return (
    <section className="space-y-3 border-t border-slate-100 pt-4">
      <h3 className="font-medium">Viết bài AI</h3>
      <div className="flex flex-wrap gap-2">
        <select value={platform} onChange={(e) => setPlatform(e.target.value as Platform)} className="input w-auto">
          {Object.entries(PLATFORMS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <select value={tone} onChange={(e) => setTone(e.target.value as Tone)} className="input w-auto">
          {Object.entries(TONES).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
        <button disabled={pending} onClick={generate} className="btn-primary">
          {pending ? "Đang viết..." : text ? "Viết lại" : "Viết bài"}
        </button>
      </div>

      {text && (
        <>
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={10} className="input" />
          <div className="flex flex-wrap gap-2">
            <button
              className="btn-secondary"
              onClick={async () => {
                await navigator.clipboard.writeText(text);
                setMessage({ kind: "success", text: "Đã copy, dán vào Facebook/TikTok là xong." });
              }}
            >
              Copy
            </button>
            {resultPlatform === "description" && (
              <button
                disabled={pending}
                className="btn-secondary"
                onClick={() =>
                  startTransition(async () => {
                    const result = await saveDescriptionAction(product.id, text);
                    setMessage(result.ok ? { kind: "success", text: "Đã lưu làm mô tả trên website." } : { kind: "error", text: result.error });
                  })
                }
              >
                Lưu làm mô tả trên website
              </button>
            )}
          </div>
        </>
      )}
      {message && <p className={`text-sm ${message.kind === "error" ? "text-red-600" : "text-emerald-600"}`}>{message.text}</p>}
    </section>
  );
}
