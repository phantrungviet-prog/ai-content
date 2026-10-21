@AGENTS.md

# AI Content Studio

Internal tool the owner (VietPhan) runs as a service for small shops and restaurants in Vietnam: AI studio product photos, AI-written posts, and paper menu → QR e-menu. No self-signup, no billing. UI text is Vietnamese; talk to the user in Vietnamese.

Full plan: `C:\Users\ADMIN\.claude\plans\l-p-cho-t-i-m-t-binary-oasis.md`. The user cut the scope to a **2-day MVP**; the "Cắt khỏi MVP" list in that plan wins over the full-version sections still in it (no multi-provider AI abstraction, no `image_jobs`/polling, no cost tracking, no standee, no content history, one website template, no Playwright).

## Status
- **Day 1 — done** (commit `b30e281`): admin login, clients CRUD, menu photo → Gemini → editable menu → publish → `/m/[slug]` + QR PNG.
- **Day 2 — code done**: products page (`/admin/clients/[id]/products`) with Nano Banana studio photos (candidate → admin approves) and AI posts (description / Facebook / TikTok, saved to `content_posts`); public site `/s/[slug]`; VietQR transfer button on `/m/[slug]` (`src/lib/vietqr.ts`, tested); bank fields on clients (migration `0002_bank_account.sql`); chip scrollbar hidden.
  - Studio photos are **untested end-to-end**: every Gemini image model has a free-tier quota of 0, so the user must enable billing in Google AI Studio first. The text and vision features work on the free tier.
  - Remaining: deploy to Vercel (push to GitHub first; `gh` CLI is not installed), set env vars there, set `NEXT_PUBLIC_SITE_URL`, scan the QR on a real phone.
  - Image presets and the Platform/Tone choices live in `src/lib/ai-options.ts` (client-safe); `src/lib/ai.ts` is server-only.

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
