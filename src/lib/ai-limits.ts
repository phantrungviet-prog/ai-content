// Daily AI limits that protect the Gemini free-tier quota, which every shop shares.
// Pure functions only, so they can be tested; src/lib/ai-quota.ts does the counting.

export type AiKind = "menu" | "post" | "image";

const KIND_LABEL: Record<AiKind, string> = { menu: "lượt đọc menu", post: "lượt viết bài", image: "lượt tạo ảnh" };

// Per shop per day. Image generation through the API is off unless GEMINI_IMAGE_ENABLED=true.
export function shopDailyLimits(imageEnabled: boolean): Record<AiKind, number> {
  return { menu: 5, post: 30, image: imageEnabled ? 10 : 0 };
}

// All shops together per day, from AI_DAILY_GLOBAL_LIMIT.
export function globalDailyLimit(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value > 0 ? value : 300;
}

// Limits reset at midnight in Vietnam (UTC+7, no daylight saving time).
const VIETNAM_OFFSET_MS = 7 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;
export function startOfVietnamDay(now: Date): Date {
  const local = now.getTime() + VIETNAM_OFFSET_MS;
  return new Date(local - (local % DAY_MS) - VIETNAM_OFFSET_MS);
}

export type QuotaInput = {
  kind: AiKind;
  usedByShop: number;
  shopLimit: number;
  usedGlobal: number;
  globalLimit: number;
  // The super admin works for clients and is not limited; their calls still count toward the global total.
  isAdmin: boolean;
};

// Returns the Vietnamese message to show when the call is not allowed, or null when it is.
export function quotaError({ kind, usedByShop, shopLimit, usedGlobal, globalLimit, isAdmin }: QuotaInput): string | null {
  if (isAdmin) return null;
  if (shopLimit === 0) return "Tính năng này chưa được mở cho tài khoản của bạn.";
  if (usedByShop >= shopLimit) return `Hôm nay bạn đã dùng hết ${shopLimit} ${KIND_LABEL[kind]}. Lượt mới có lại lúc 0 giờ.`;
  if (usedGlobal >= globalLimit) return "Hệ thống đã dùng hết lượt AI miễn phí của hôm nay. Vui lòng quay lại vào ngày mai.";
  return null;
}

export function remainingText(kind: AiKind, remaining: number | null): string {
  return remaining === null ? "Không giới hạn (quản trị viên)" : `Còn ${remaining} ${KIND_LABEL[kind]} hôm nay`;
}
