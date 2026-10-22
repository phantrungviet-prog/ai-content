import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Refreshes the Supabase session cookie and sends visitors to the right auth page.
// This is only an optimistic check: data access is enforced by RLS and the helpers in src/lib/auth.ts.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll(cookiesToSet, headers) {
          for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) response.cookies.set(name, value, options);
          for (const [key, value] of Object.entries(headers ?? {})) response.headers.set(key, value);
        },
      },
    },
  );

  const { data } = await supabase.auth.getClaims();
  const path = request.nextUrl.pathname;
  const redirectTo = (pathname: string) => {
    const url = request.nextUrl.clone();
    url.pathname = pathname;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    // Keep any session cookie refreshed above.
    for (const cookie of response.cookies.getAll()) redirect.cookies.set(cookie);
    return redirect;
  };
  if (!data?.claims) {
    if (path.startsWith("/admin") || path === "/onboarding") return redirectTo("/login");
    // The reset link signs the user in first; without a session the link was never opened or has expired.
    if (path === "/reset-password") return redirectTo("/forgot-password");
  } else if (path === "/login" || path === "/signup") {
    return redirectTo("/admin");
  }
  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/login", "/signup", "/onboarding", "/reset-password"],
};
