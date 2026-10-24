# AI Content Studio

Web app cho quán ăn, quán nước và shop nhỏ ở Việt Nam. Chủ shop tự đăng ký bằng email, rồi dùng các tính năng sau:
- chụp menu giấy để có menu điện tử QR (kèm nút chuyển khoản VietQR);
- AI viết bài Facebook / TikTok và mô tả sản phẩm;
- tải ảnh studio lên cho sản phẩm;
- một website giới thiệu cho shop.

Miễn phí, có giới hạn lượt AI mỗi ngày. Chủ dự án là super admin, xem và sửa được mọi shop, và khóa được shop vi phạm.

Stack: Next.js 16 · Supabase (Postgres + RLS, Auth, Storage) · Gemini · Vercel · Brevo (SMTP).

## Cài đặt lần đầu

1. Điền `.env.local` theo mẫu `.env.example`.
2. Supabase → **SQL Editor**: lần lượt dán và chạy `supabase/migrations/0001_init.sql`, `0002_bank_account.sql`, `0003_self_signup.sql`.
3. Tạo tài khoản super admin: **Authentication → Users → Add user** (tick *Auto Confirm User*), rồi chạy:
   ```sql
   insert into public.admins (user_id) select id from auth.users where email = 'ban@example.com';
   ```
4. Cấu hình Auth cho tự đăng ký:
   - **Sign In / Providers:** bật *Allow new users to sign up* và *Confirm email*.
   - **URL Configuration:** *Site URL* = domain production; thêm Redirect URL `https://<domain>/auth/confirm`.
   - **Emails → SMTP Settings:** khai báo SMTP riêng (Brevo: `smtp-relay.brevo.com`, cổng 587). Bắt buộc phải có để sửa được mẫu email.
   - **Emails → Templates:** link trong email phải là
     - Confirm signup: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email`
     - Reset password: `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery`
5. `npm run dev` → mở http://localhost:3000

## Lệnh

- `npm run dev`: chạy local
- `npm test`: unit test (giá VND, slug, VietQR, hạn mức AI)
- `npm run build`: build production
- `npm run rls-check`: kiểm tra cách ly dữ liệu giữa các shop trên một project Supabase **thử** (đọc `.env.rls-test`, xem hướng dẫn đầu file `scripts/rls-check.mjs`). Chạy lại sau mỗi lần sửa RLS, trước khi chạy migration trên database thật.

## Cấu trúc chính

- `src/app/page.tsx`: landing page · `src/app/terms`, `src/app/privacy`: điều khoản, chính sách
- `src/app/signup`, `login`, `forgot-password`, `reset-password`, `auth/confirm`, `onboarding`: tài khoản và tạo shop
- `src/app/admin/`: khu quản lý. Super admin thấy danh sách mọi shop, chủ shop vào thẳng shop của mình.
- `src/app/m/[slug]/`: menu công khai (đích của mã QR) · `src/app/s/[slug]/`: website của shop
- `src/lib/auth.ts`: `requireUser`, `requireClientAccess`, `requireSuperAdmin`
- `src/lib/ai.ts`: gọi Gemini (model dự phòng, timeout) · `src/lib/ai-limits.ts`, `ai-quota.ts`: hạn mức AI
- `supabase/migrations/`: schema, RLS, `save_menu`, `can_manage`, `admin_list_clients`
