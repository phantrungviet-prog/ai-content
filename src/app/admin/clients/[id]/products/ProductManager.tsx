"use client";

import { useState, useTransition } from "react";
import { ASPECT_RATIOS, PLATFORMS, STUDIO_PRESETS, studioPrompt, TONES, type AspectRatio, type Platform, type StudioPreset, type Tone } from "@/lib/ai-options";
import { remainingText } from "@/lib/ai-limits";
import { resizeImage } from "@/lib/image-resize";
import { formatVnd } from "@/lib/price";
import { slugify } from "@/lib/slug";
import { createClient } from "@/lib/supabase/client";
import {
  approveStudioImageAction,
  createProductAction,
  deleteProductAction,
  generatePostAction,
  generateStudioImageAction,
  removeStudioImageAction,
  saveDescriptionAction,
  setFeaturedAction,
} from "./actions";

export type ProductView = {
  id: string;
  name: string;
  price: number | null;
  description: string;
  originalUrl: string | null;
  studioImages: { path: string; url: string }[];
  // Shown on the public site.
  isFeatured: boolean;
  // Linked from at least one menu item.
  inMenu: boolean;
};

// Cards start open only for small catalogs; a menu can add dozens of products.
const OPEN_BY_DEFAULT_MAX = 5;

// postsLeft: AI posts this shop may still write today, shared by all products; null = unlimited (super admin).
export function ProductManager({
  clientId,
  products,
  autoStudio,
  postsLeft,
}: {
  clientId: string;
  products: ProductView[];
  autoStudio: boolean;
  postsLeft: number | null;
}) {
  const [query, setQuery] = useState("");
  const q = slugify(query);
  const visible = q ? products.filter((p) => slugify(p.name).includes(q)) : products;
  const featured = products.filter((p) => p.isFeatured).length;

  return (
    <div className="space-y-6">
      <NewProductForm clientId={clientId} />
      {products.length === 0 ? (
        <p className="text-slate-500">Chưa có sản phẩm. Thêm sản phẩm đầu tiên ở trên, hoặc lưu menu để tạo sản phẩm từ các món.</p>
      ) : (
        <>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              {products.length} sản phẩm · ⭐ {featured} hiện trên website. Món trong menu tự có ở đây; bấm ☆ để đưa lên website.
            </p>
            {products.length > OPEN_BY_DEFAULT_MAX && (
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Tìm sản phẩm..." className="input w-full sm:w-64" />
            )}
          </div>
          {visible.map((p) => (
            <ProductCard
              key={p.id}
              clientId={clientId}
              product={p}
              autoStudio={autoStudio}
              postsLeft={postsLeft}
              defaultOpen={products.length <= OPEN_BY_DEFAULT_MAX}
            />
          ))}
        </>
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

function ProductCard({
  clientId,
  product,
  autoStudio,
  postsLeft,
  defaultOpen,
}: {
  clientId: string;
  product: ProductView;
  autoStudio: boolean;
  postsLeft: number | null;
  defaultOpen: boolean;
}) {
  const [deleting, startDelete] = useTransition();
  const [starring, startStar] = useTransition();
  const [open, setOpen] = useState(defaultOpen);
  const thumbnail = product.studioImages[0]?.url ?? product.originalUrl;
  return (
    <article className={`card ${open ? "space-y-5" : "py-4"}`}>
      <header className="flex items-center gap-3">
        <button
          disabled={starring}
          onClick={() =>
            startStar(async () => {
              const result = await setFeaturedAction(product.id, !product.isFeatured);
              if (!result.ok) alert(result.error);
            })
          }
          title={product.isFeatured ? "Đang hiện trên website, bấm để ẩn" : "Bấm để hiện trên website"}
          className={`shrink-0 text-2xl leading-none ${product.isFeatured ? "text-amber-400" : "text-slate-300 hover:text-amber-300"}`}
        >
          {product.isFeatured ? "★" : "☆"}
        </button>
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element -- Supabase storage URL
          <img src={thumbnail} alt="" className="size-12 shrink-0 rounded-lg object-cover" />
        )}
        <button onClick={() => setOpen(!open)} className="min-w-0 flex-1 text-left">
          <h2 className="truncate text-lg font-semibold">{product.name}</h2>
          <p className="flex flex-wrap items-center gap-2 text-sm text-slate-500">
            {product.price != null && <span>{formatVnd(product.price)}</span>}
            {product.inMenu && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">Trong menu</span>}
            {!open && <span className="text-xs text-indigo-600">Mở ▾</span>}
          </p>
        </button>
        <button
          disabled={deleting}
          onClick={() => {
            const warning = product.inMenu ? "\n\nMón này đang có trong menu: lần lưu menu sau sẽ tạo lại sản phẩm (không có ảnh)." : "";
            if (!confirm(`Xóa sản phẩm "${product.name}" và toàn bộ ảnh?${warning}`)) return;
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
      {open && (
        <>
          <StudioSection clientId={clientId} product={product} autoStudio={autoStudio} />
          <PostSection product={product} postsLeft={postsLeft} />
        </>
      )}
    </article>
  );
}

function StudioSection({ clientId, product, autoStudio }: { clientId: string; product: ProductView; autoStudio: boolean }) {
  const [preset, setPreset] = useState<StudioPreset>("white");
  const [copied, setCopied] = useState(false);
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

  // Images made by hand in the Gemini app: the admin already chose them, so they are approved on upload.
  async function uploadStudioImage(file: File) {
    await run("upload", async () => {
      try {
        const blob = await resizeImage(file, 2048, 0.92);
        const path = `${clientId}/products/${product.id}/${crypto.randomUUID()}.jpg`;
        const { error } = await createClient().storage.from("public-assets").upload(path, blob, { contentType: "image/jpeg" });
        if (error) return { ok: false, error: `Tải ảnh thất bại: ${error.message}` };
        return await approveStudioImageAction(product.id, path);
      } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : "Có lỗi xảy ra." };
      }
    });
  }

  return (
    <section className="space-y-3">
      <h3 className="font-medium">Ảnh Studio</h3>
      <ol className="list-decimal space-y-1 pl-5 text-sm text-slate-600">
        <li>Chọn kiểu nền rồi bấm <b>Copy prompt</b>.</li>
        <li>
          Mở{" "}
          <a href="https://gemini.google.com/app" target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">
            Gemini
          </a>
          , đính kèm ảnh gốc, dán prompt và gửi. Tải ảnh kết quả về máy.
        </li>
        <li>
          Bấm <b>Tải ảnh studio lên</b>. Nhớ kiểm tra AI có vẽ sai sản phẩm không.
        </li>
      </ol>
      <div className="flex flex-wrap items-end gap-2">
        <select value={preset} onChange={(e) => setPreset(e.target.value as StudioPreset)} className="input w-auto">
          {Object.entries(STUDIO_PRESETS).map(([key, p]) => (
            <option key={key} value={key}>
              {p.label}
            </option>
          ))}
        </select>
        <button
          className="btn-secondary"
          onClick={async () => {
            await navigator.clipboard.writeText(studioPrompt(preset));
            setCopied(true);
          }}
        >
          {copied ? "Đã copy prompt" : "Copy prompt"}
        </button>
        {product.originalUrl && (
          <button className="btn-secondary" onClick={() => download(product.originalUrl!, `${product.name}-goc.jpg`)}>
            Tải ảnh gốc
          </button>
        )}
        <label className={`btn-primary cursor-pointer ${busy !== null ? "pointer-events-none opacity-50" : ""}`}>
          {busy === "upload" ? "Đang tải lên..." : "Tải ảnh studio lên"}
          <input
            type="file"
            accept="image/*"
            className="hidden"
            disabled={busy !== null}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = "";
              if (file) uploadStudioImage(file);
            }}
          />
        </label>
      </div>

      {autoStudio && product.originalUrl && (
        <div className="flex flex-wrap items-end gap-2 border-t border-dashed border-slate-200 pt-3">
          <span className="text-sm text-slate-500">Hoặc tạo tự động qua API:</span>
          <select value={ratio} onChange={(e) => setRatio(e.target.value as AspectRatio)} className="input w-auto">
            {ASPECT_RATIOS.map((r) => (
              <option key={r} value={r}>
                {r === "1:1" ? "Vuông 1:1" : r === "3:4" ? "Dọc 3:4 (Facebook)" : "Dọc 9:16 (TikTok/Story)"}
              </option>
            ))}
          </select>
          <button
            disabled={busy !== null}
            className="btn-secondary"
            onClick={() =>
              run("generate", async () => {
                const result = await generateStudioImageAction(product.id, preset, ratio);
                if (result.ok) setCandidates((c) => [result.data, ...c]);
                return result;
              })
            }
          >
            {busy === "generate" ? "AI đang tạo ảnh (~20 giây)..." : "Tạo tự động"}
          </button>
        </div>
      )}
      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {product.originalUrl && <Figure url={product.originalUrl} caption="Ảnh gốc" />}

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

function PostSection({ product, postsLeft }: { product: ProductView; postsLeft: number | null }) {
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
        <button disabled={pending || postsLeft === 0} onClick={generate} className="btn-primary">
          {pending ? "Đang viết..." : text ? "Viết lại" : "Viết bài"}
        </button>
      </div>
      <p className="text-xs text-slate-500">{remainingText("post", postsLeft)}</p>

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
