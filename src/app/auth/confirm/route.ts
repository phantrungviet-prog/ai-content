import type { EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Target of the links in Supabase's "Confirm signup" and "Reset password" emails:
//   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email     (or type=recovery)
// token_hash works on any device, unlike the PKCE code flow, which needs the browser that signed up.
const ALLOWED_TYPES: EmailOtpType[] = ["email", "signup", "recovery"];

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  if (!tokenHash || !type || !ALLOWED_TYPES.includes(type)) redirect("/login?error=link");

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type });
  if (error) {
    console.error("auth/confirm verifyOtp failed", { type, code: error.code });
    redirect("/login?error=link");
  }
  // /admin sends a new owner on to /onboarding.
  redirect(type === "recovery" ? "/reset-password" : "/admin");
}
