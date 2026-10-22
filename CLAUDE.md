@AGENTS.md

# AI Content Studio

Web app for small shops and restaurants in Vietnam: AI studio product photos, AI-written posts, and paper menu → QR e-menu, plus a simple public website per shop. Owner: VietPhan. UI text is Vietnamese; talk to the user in Vietnamese.

Built first as an internal tool (only the owner logs in and manages shops for clients). That **2-day MVP is done and deployed on Vercel** from GitHub `phantrungviet-prog/ai-content` (branch `main`).

## Next: self-signup upgrade (approved, not started)
Approved plan: `C:\Users\ADMIN\.claude\plans\l-p-cho-t-i-m-t-binary-oasis.md` (it replaced the old MVP plan). Decisions the user made:
- Shop owners sign up themselves with **email + password** only (email confirmation, password reset). No Google login, no SMS.
- **Free only**, no billing yet. Per-shop daily AI limits plus a global daily cap protect the shared Gemini free-tier quota.
- **One account = one shop** (`clients.owner_id` unique).
- **Keep the service mode**: the owner stays super admin (the `admins` table) and can see and edit every shop. Existing shops keep `owner_id = null`.
Execute the plan's steps in order.
- **Step 1 status:** `rls-check` passed all checks on the test project (2026-10-22); 0003 not yet run on live, code not yet deployed: `supabase/migrations/0003_self_signup.sql`, the new `src/lib/auth.ts`, and `scripts/rls-check.mjs` (`npm run rls-check`, reads `.env.rls-test` for a separate **test** Supabase project). Order: run 0001–0003 on the test project and pass the check, then run 0003 on live, and only then deploy the code (it calls the `can_manage` RPC, which exists only after 0003). Step 1 rewrites all RLS on a live database: write and pass `scripts/rls-check.mjs` (user A cannot read or modify user B's data) **before** telling the user to run migration `0003`.

## MVP history
- **Day 1 — done** (commit `b30e281`): admin login, clients CRUD, menu photo → Gemini → editable menu → publish → `/m/[slug]` + QR PNG.
- **Day 2 — code done**: products page (`/admin/clients/[id]/products`) with Nano Banana studio photos (candidate → admin approves) and AI posts (description / Facebook / TikTok, saved to `content_posts`); public site `/s/[slug]`; VietQR transfer button on `/m/[slug]` (`src/lib/vietqr.ts`, tested); bank fields on clients (migration `0002_bank_account.sql`); chip scrollbar hidden.
  - Studio photos: every Gemini image model has a free-tier quota of 0, and the user has no card to enable billing. The **main flow is manual**: copy `studioPrompt(preset)`, generate in the Gemini app (user has Google AI Pro), then use "Tải ảnh studio lên", which uploads to `public-assets` and approves directly. The API flow (`generateStudioImageAction`) is hidden unless `GEMINI_IMAGE_ENABLED=true` and has never been tested end-to-end. The text and vision features work on the free tier.
  - Deployed on Vercel. `NEXT_PUBLIC_*` env vars there are of type Config, and `GEMINI_API_KEY` is Secret. `gh` CLI is not installed, and pushing needs the user's GitHub login (Git Credential Manager).
  - Image presets and the Platform/Tone choices live in `src/lib/ai-options.ts` (client-safe); `src/lib/ai.ts` is server-only.

## Roadmap after the MVP (not scheduled yet)
- **One catalog per client (agreed in principle; do it after the self-signup upgrade).** Menu items and products are currently unrelated. Plan: `products` is the catalog. A new migration (next free number) adds `menu_items.product_id` (FK, `on delete set null`) and `products.is_featured`. `save_menu` links each item to a product with the same name (case-insensitive) or creates it, and syncs the price. Studio photos then show as thumbnails on `/m/[slug]`, and `/s/[slug]` lists only featured (⭐) products. Renaming an item creates a new product; the old one stays for the admin to clean up. Shops without a menu keep using the products page as is.
- **Level 2: ordering at the table.** QR per table (`/m/[slug]?ban=5`); cart + notes; `orders` / `order_items` tables that snapshot name and price. Orders are created only through a server action that **recomputes prices from the DB** (never trusts client prices), with rate limiting. A staff screen gets live updates from Supabase Realtime. This needs per-shop staff accounts: a `client_members (user_id, client_id, role)` table, with RLS scoped to the shop, alongside `admins`. After an order, show a VietQR with the amount and "Ban 5 - DH123" filled in.
- **Level 3: automatic payment confirmation.** Use PayOS (or a SePay/Casso webhook) via **the shop's own account**. Money goes straight to the shop and we never hold it. Credentials are stored per client in encrypted form. The webhook route handler verifies the signature and is idempotent on the order code (keep a `payment_events` log), then marks the order paid.

## Stack and conventions
- Next.js 16 (App Router, Turbopack), React 19, Tailwind v4, TypeScript. Read `node_modules/next/dist/docs/` before using unfamiliar Next APIs.
  - `src/proxy.ts` replaces middleware: refreshes the Supabase session and redirects signed-out users away from `/admin`.
  - `params` / `searchParams` / `cookies()` are async; type pages with the global `PageProps<"/route">` / `LayoutProps<"/route">` helpers (run `npx next typegen` after adding routes).
  - `cacheComponents` is deliberately **off**; pages that read cookies are simply dynamic.
- Supabase via `@supabase/ssr`: `src/lib/supabase/server.ts` (per request) and `client.ts` (browser). No service-role key anywhere; everything runs as the signed-in user under RLS.
- Every admin page and server action starts with a helper from `src/lib/auth.ts`: `requireClientAccess(clientId)` (owner or super admin, checked by the `can_manage()` RPC), `requireUser()`, or `requireSuperAdmin()`. Product actions use `requireProductAccess` in their file. Call these outside `try/catch`, because `notFound()` and `redirect()` work by throwing. Shop data is publicly readable, so a row being visible through RLS does not prove access. Super admin rights come from the `public.admins` table (`is_admin()` in SQL).
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
