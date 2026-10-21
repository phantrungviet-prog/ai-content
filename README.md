# AI Content Studio

Tool nội bộ: menu điện tử QR từ ảnh menu giấy, ảnh sản phẩm studio và viết bài AI cho shop/quán ăn.
Stack: Next.js 16 · Supabase (Postgres, Auth, Storage) · Gemini.

## Cài đặt lần đầu

1. Điền `.env.local` (mẫu ở `.env.example`).
2. Supabase → **SQL Editor** → dán toàn bộ `supabase/migrations/0001_init.sql` → **Run**.
3. Supabase → **Authentication → Users → Add user** (email + mật khẩu, tick *Auto Confirm User*).
4. Cấp quyền admin cho user đó (SQL Editor):
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'ban@example.com';
   ```
5. Nên tắt tự đăng ký: **Authentication → Sign In / Providers → tắt "Allow new users to sign up"**.
6. `npm run dev` → mở http://localhost:3000

## Lệnh

- `npm run dev`: chạy local
- `npm test`: unit test (chuẩn hóa giá, slug)
- `npm run build`: build production

## Cấu trúc chính

- `src/app/admin/`: khu quản trị (cần đăng nhập + có trong bảng `admins`)
- `src/app/m/[slug]/`: menu công khai (đích của mã QR)
- `src/lib/ai.ts`: gọi Gemini đọc menu
- `src/lib/price.ts`: chuẩn hóa giá VND ("35k" → 35000)
- `supabase/migrations/`: schema, RLS, hàm `save_menu`
