import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "AI Content Studio · Menu QR, ảnh sản phẩm và bài đăng cho quán của bạn",
  description: "Chụp menu giấy thành menu QR trong một phút, viết bài Facebook / TikTok bằng AI, có sẵn website cho shop. Miễn phí.",
};

const FEATURES = [
  {
    title: "Menu giấy thành menu QR",
    desc: "Chụp ảnh menu, AI đọc tên món và giá. Sửa lại nếu cần, bấm hiển thị, in mã QR dán lên bàn. Khách quét là xem được, có cả nút chuyển khoản VietQR.",
    mock: <MenuMock />,
  },
  {
    title: "Bài đăng viết sẵn",
    desc: "Chọn món, chọn Facebook hay TikTok, chọn giọng văn. AI viết caption, hashtag và gợi ý quay video, bạn chỉ việc copy và đăng.",
    mock: <PostMock />,
  },
  {
    title: "Website riêng cho shop",
    desc: "Một trang giới thiệu có món nổi bật, ảnh studio, nút gọi điện, nhắn Zalo và chỉ đường. Gửi link cho khách hoặc gắn lên Facebook.",
    mock: <SiteMock />,
  },
];

const STEPS = [
  { title: "Đăng ký bằng email", desc: "Miễn phí, không cần thẻ." },
  { title: "Tạo cửa hàng", desc: "Nhập tên quán, chọn đường dẫn." },
  { title: "Chụp menu, đăng bài", desc: "Có menu QR và bài viết trong vài phút." },
];

export default function Home() {
  return (
    <div className="flex flex-1 flex-col bg-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4">
        <span className="font-semibold text-indigo-700">AI Content Studio</span>
        <Link href="/login" className="text-sm font-medium text-slate-600 hover:text-slate-900">
          Đăng nhập
        </Link>
      </header>

      <section className="mx-auto w-full max-w-6xl px-5 pb-16 pt-10 text-center sm:pt-16">
        <p className="mx-auto mb-4 w-fit rounded-full bg-indigo-50 px-3 py-1 text-xs font-medium text-indigo-700">
          Dành cho quán ăn, quán nước và shop nhỏ
        </p>
        <h1 className="mx-auto max-w-3xl text-4xl font-bold leading-tight tracking-tight text-slate-900 sm:text-5xl">
          Menu QR, bài đăng và website cho quán của bạn, làm bằng AI
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
          Chụp menu giấy là có menu điện tử. Chọn món là có bài đăng Facebook, TikTok. Không cần biết thiết kế hay viết lách.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/signup" className="btn-primary px-6 py-3 text-base">
            Dùng miễn phí
          </Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">
            Đăng nhập
          </Link>
        </div>
      </section>

      <section className="bg-slate-50 py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-5 md:grid-cols-3">
          {FEATURES.map((f) => (
            <article key={f.title} className="card flex flex-col gap-4">
              <div className="flex h-44 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-50 to-slate-100">{f.mock}</div>
              <h2 className="text-lg font-semibold">{f.title}</h2>
              <p className="text-sm leading-relaxed text-slate-600">{f.desc}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto w-full max-w-6xl px-5 py-16">
        <h2 className="text-center text-2xl font-bold">Bắt đầu trong 3 bước</h2>
        <ol className="mt-8 grid gap-6 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-4">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-indigo-600 font-semibold text-white">{i + 1}</span>
              <div>
                <p className="font-medium">{s.title}</p>
                <p className="text-sm text-slate-500">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-12 rounded-2xl bg-indigo-600 px-6 py-10 text-center text-white">
          <p className="text-xl font-semibold">Miễn phí cho mọi cửa hàng</p>
          <p className="mx-auto mt-2 max-w-xl text-sm text-indigo-100">
            Mỗi ngày bạn có 5 lượt đọc menu và 30 lượt viết bài bằng AI. Tiền khách chuyển khoản qua VietQR vào thẳng tài khoản của bạn.
          </p>
          <Link href="/signup" className="mt-6 inline-flex rounded-lg bg-white px-6 py-3 font-medium text-indigo-700 hover:bg-indigo-50">
            Tạo tài khoản
          </Link>
        </div>
      </section>

      <footer className="mt-auto border-t border-slate-100 py-6 text-center text-sm text-slate-500">
        <Link href="/terms" className="hover:text-slate-900">
          Điều khoản sử dụng
        </Link>
        <span className="mx-2">·</span>
        <Link href="/privacy" className="hover:text-slate-900">
          Chính sách bảo mật
        </Link>
      </footer>
    </div>
  );
}

// Small drawings of each feature, built from divs so the page needs no images.
function MenuMock() {
  return (
    <div className="flex items-center gap-3">
      <div className="w-24 space-y-1.5 rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
        {["Phở bò", "Bún chả", "Trà đá"].map((name) => (
          <div key={name} className="flex justify-between text-[9px] text-slate-600">
            <span>{name}</span>
            <span className="font-semibold">35k</span>
          </div>
        ))}
      </div>
      <span className="text-indigo-400">→</span>
      <div className="grid size-16 grid-cols-4 gap-0.5 rounded-lg bg-white p-1.5 shadow-sm ring-1 ring-slate-200">
        {Array.from({ length: 16 }, (_, i) => (
          <span key={i} className={[0, 2, 3, 5, 6, 9, 10, 12, 15].includes(i) ? "bg-slate-800" : "bg-white"} />
        ))}
      </div>
    </div>
  );
}

function PostMock() {
  return (
    <div className="w-44 space-y-2 rounded-lg bg-white p-3 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <span className="size-5 rounded-full bg-indigo-200" />
        <span className="h-1.5 w-16 rounded bg-slate-300" />
      </div>
      <div className="space-y-1">
        <span className="block h-1.5 w-full rounded bg-slate-200" />
        <span className="block h-1.5 w-5/6 rounded bg-slate-200" />
        <span className="block h-1.5 w-2/3 rounded bg-slate-200" />
      </div>
      <p className="text-[9px] text-indigo-600">#caphemuoi #quanngon</p>
    </div>
  );
}

function SiteMock() {
  return (
    <div className="w-44 overflow-hidden rounded-lg bg-white shadow-sm ring-1 ring-slate-200">
      <div className="bg-gradient-to-br from-slate-900 to-indigo-900 px-3 py-3 text-center">
        <span className="mx-auto block h-1.5 w-16 rounded bg-white/80" />
        <span className="mx-auto mt-2 block h-3 w-12 rounded-full bg-white" />
      </div>
      <div className="grid grid-cols-2 gap-1.5 p-2">
        <span className="aspect-square rounded bg-amber-100" />
        <span className="aspect-square rounded bg-emerald-100" />
      </div>
    </div>
  );
}
