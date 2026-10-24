import { describe, expect, it } from "vitest";
import { globalDailyLimit, quotaError, shopDailyLimits, startOfVietnamDay, type QuotaInput } from "./ai-limits";

describe("startOfVietnamDay", () => {
  it("is 17:00 UTC of the previous day", () => {
    // 10:00 in Vietnam on 24 Oct.
    expect(startOfVietnamDay(new Date("2026-10-24T03:00:00Z")).toISOString()).toBe("2026-10-23T17:00:00.000Z");
  });

  it("switches at midnight Vietnam time, not UTC", () => {
    // 23:59 and 00:01 in Vietnam.
    expect(startOfVietnamDay(new Date("2026-10-24T16:59:00Z")).toISOString()).toBe("2026-10-23T17:00:00.000Z");
    expect(startOfVietnamDay(new Date("2026-10-24T17:01:00Z")).toISOString()).toBe("2026-10-24T17:00:00.000Z");
  });
});

describe("quotaError", () => {
  const base: QuotaInput = { kind: "menu", usedByShop: 0, shopLimit: 5, usedGlobal: 0, globalLimit: 300, isAdmin: false };

  it("allows calls under both limits", () => {
    expect(quotaError({ ...base, usedByShop: 4, usedGlobal: 299 })).toBeNull();
  });

  it("blocks at the shop limit", () => {
    expect(quotaError({ ...base, usedByShop: 5 })).toMatch(/hết 5 lượt đọc menu/);
  });

  it("blocks at the global limit", () => {
    expect(quotaError({ ...base, usedGlobal: 300 })).toMatch(/Hệ thống đã dùng hết/);
  });

  it("blocks a feature whose limit is zero", () => {
    expect(quotaError({ ...base, kind: "image", shopLimit: 0 })).toMatch(/chưa được mở/);
  });

  it("never blocks the super admin", () => {
    expect(quotaError({ ...base, usedByShop: 99, usedGlobal: 999, shopLimit: 0, isAdmin: true })).toBeNull();
  });
});

it("turns image generation on only with the flag", () => {
  expect(shopDailyLimits(false).image).toBe(0);
  expect(shopDailyLimits(true).image).toBeGreaterThan(0);
});

it("falls back to the default global limit for missing or invalid values", () => {
  expect(globalDailyLimit(undefined)).toBe(300);
  expect(globalDailyLimit("abc")).toBe(300);
  expect(globalDailyLimit("-5")).toBe(300);
  expect(globalDailyLimit("1000")).toBe(1000);
});
