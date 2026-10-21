@AGENTS.md

# AI Content Studio

Internal tool the owner (VietPhan) runs as a service for small shops and restaurants in Vietnam: AI studio product photos, AI-written posts, and paper menu → QR e-menu. No self-signup, no billing. UI text is Vietnamese; talk to the user in Vietnamese.

Full plan: `C:\Users\ADMIN\.claude\plans\l-p-cho-t-i-m-t-binary-oasis.md`. The user cut the scope to a **2-day MVP**; the "Cắt khỏi MVP" list in that plan wins over the full-version sections still in it (no multi-provider AI abstraction, no `image_jobs`/polling, no cost tracking, no standee, no content history, one website template, no Playwright).

## Status
- **Day 1 — done** (commit `b30e281`): admin login, clients CRUD, menu photo → Gemini → editable menu → publish → `/m/[slug]` + QR PNG.
- **Day 2 — todo:**
  1. Studio photos: upload product photo → Photoroom API (remove bg + AI background, 3–4 fixed presets) → save to `public-assets` → before/after + download. Needs `PHOTOROOM_API_KEY` in `.env.local` / `.env.example`; check current Photoroom API docs before coding.
  2. "Viết bài" button: product description / Facebook caption / TikTok caption + hashtags via Gemini (`src/lib/ai.ts`), copy in one click.
  3. Public site `/s/[slug]`: one shared template (hero, products, link to menu, Zalo/phone/Maps).
  4. Payment level 1 (VietQR transfer): migration `0002` adds the client's bank (`bank_bin`, `bank_account_no`, `bank_account_name`) to `clients`, editable in `ClientInfoForm`. `/m/[slug]` shows a "Thanh toán chuyển khoản" button that opens a VietQR. Build the EMVCo/VietQR payload ourselves in `src/lib/vietqr.ts` (with a CRC16 unit test) and render it with `qrcode`, with no external image service. Make the function take an optional `amount` and `addInfo`; level 1 leaves both empty, and level 2 will pass them per order.
  5. Deploy to Vercel (push to GitHub first), set `NEXT_PUBLIC_SITE_URL`, scan the QR on a real phone.
  Also fix: hide the visible scrollbar under the category chips on `/m/[slug]` (`MenuView.tsx`).
  The client page `src/app/admin/clients/[id]/page.tsx` has "Sắp có" placeholder cards for features 1–2.

## Roadmap after the MVP (not scheduled yet)
- **Level 2: ordering at the table.** QR per table (`/m/[slug]?ban=5`); cart + notes; `orders` / `order_items` tables that snapshot name and price. Orders are created only through a server action that **recomputes prices from the DB** (never trusts client prices), with rate limiting. A staff screen gets live updates from Supabase Realtime. This needs per-shop staff accounts: a `client_members (user_id, client_id, role)` table, with RLS scoped to the shop, alongside `admins`. After an order, show a VietQR with the amount and "Ban 5 - DH123" filled in.
- **Level 3: automatic payment confirmation.** Use PayOS (or a SePay/Casso webhook) via **the shop's own account**. Money goes straight to the shop and we never hold it. Credentials are stored per client in encrypted form. The webhook route handler verifies the signature and is idempotent on the order code (keep a `payment_events` log), then marks the order paid.

## Stack and conventions
- Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript. Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.
  - `src/proxy.ts` replaces middleware: refreshes the Supabase session and redirects signed-out users away from `/admin`.
  - `params` / `searchParams` / `cookies()` are async; type pages with the global `PageProps<"/route">` / `LayoutProps<"/route">` helpers (run `npx next typegen` after adding routes).
  - `cacheComponents` is deliberately **off**; pages that read cookies are simply dynamic.
- Supabase via `@supabase/ssr`: `src/lib/supabase/server.ts` (per request) and `client.ts` (browser). No service-role key anywhere; everything runs as the signed-in user under RLS.
- Every admin page and server action starts with `requireAdmin()` from `src/lib/auth.ts`. Admin rights come from the `public.admins` table (`is_admin()` in SQL), not just from being signed in.
- Gemini: `@google/genai`, model from `GEMINI_MODEL`. Use structured JSON output with a zod schema (`z.toJSONSchema`) and validate with `safeParse`; see `extractMenuFromImages`.
- Prices are whole VND integers. Anything a model or a person types goes through `parseVndPrice` (`src/lib/price.ts`, tested); display with `formatVnd`.
- Client slugs are printed in QR codes: never make them editable.
- Images are resized in the browser (`src/lib/image-resize.ts`), uploaded straight to Storage, and server actions receive only storage paths (the server action body limit is 1 MB). Buckets: `originals` (private), `public-assets` (public).
- Styling: plain Tailwind plus the `.input`, `.btn-primary`, `.btn-secondary`, `.card` classes in `src/app/globals.css` (no shadcn). Font: Be Vietnam Pro.

## Database
- Schema lives in `supabase/migrations/`. There is no Supabase CLI: the user pastes each file into the Supabase SQL Editor. For schema changes, add a new `0002_*.sql` (never edit `0001_init.sql`) and tell the user to run it.
- Tables: `admins`, `clients`, `products`, `content_posts`, `menus` (one per client), `menu_categories`, `menu_items`. `products` and `content_posts` already exist for Day 2.
- Menus are saved only through the `save_menu` RPC so that a whole menu is replaced in a single transaction.

## Commands
- `npm run dev` · `npm test` (vitest) · `npm run build` · `npx eslint src` · `npx tsc --noEmit`
- Never read or print key values from `.env.local`.
