import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Create a fresh client per request; never share one across requests.
export async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
          } catch {
            // Server Components cannot set cookies; src/proxy.ts refreshes the session instead.
          }
        },
      },
    },
  );
}
