import "server-only";
import { globalDailyLimit, quotaError, shopDailyLimits, startOfVietnamDay, type AiKind } from "@/lib/ai-limits";
import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const limits = () => shopDailyLimits(process.env.GEMINI_IMAGE_ENABLED === "true");

async function usageToday(supabase: Supabase, clientId: string, kind: AiKind) {
  const since = startOfVietnamDay(new Date()).toISOString();
  const [shop, global] = await Promise.all([
    supabase.from("ai_usage").select("id", { count: "exact", head: true }).eq("client_id", clientId).eq("kind", kind).gte("created_at", since),
    // security definer: the caller cannot see other shops' rows, only this total.
    supabase.rpc("ai_usage_global_count", { p_since: since }),
  ]);
  if (shop.error || global.error) throw new Error(`ai_usage count failed: ${(shop.error ?? global.error)?.message}`);
  return { usedByShop: shop.count ?? 0, usedGlobal: (global.data as number | null) ?? 0 };
}

// Call before Gemini. Returns a message to show the user, or null when the call may go ahead.
// Fails closed: if usage cannot be counted, the call is refused rather than risking the shared quota.
export async function checkAiQuota(supabase: Supabase, clientId: string, kind: AiKind, isAdmin: boolean): Promise<string | null> {
  if (isAdmin) return null;
  try {
    const used = await usageToday(supabase, clientId, kind);
    return quotaError({ kind, ...used, shopLimit: limits()[kind], globalLimit: globalDailyLimit(process.env.AI_DAILY_GLOBAL_LIMIT), isAdmin });
  } catch (err) {
    console.error("checkAiQuota failed", { clientId, kind, err });
    return "Không kiểm tra được lượt AI còn lại, vui lòng thử lại.";
  }
}

// Call after a successful Gemini call, so a Google outage does not use up the shop's daily calls.
// Best effort: the user already has the result, and a missing row only under-counts by one.
export async function recordAiUsage(supabase: Supabase, clientId: string, kind: AiKind) {
  const { error } = await supabase.from("ai_usage").insert({ client_id: clientId, kind });
  if (error) console.error("recordAiUsage failed", { clientId, kind, error });
}

// Calls left today for this shop, or null when unlimited (super admin).
export async function aiRemainingToday(supabase: Supabase, clientId: string, kind: AiKind, isAdmin: boolean): Promise<number | null> {
  if (isAdmin) return null;
  try {
    const { usedByShop } = await usageToday(supabase, clientId, kind);
    return Math.max(0, limits()[kind] - usedByShop);
  } catch (err) {
    console.error("aiRemainingToday failed", { clientId, kind, err });
    return 0;
  }
}
