import { describe, expect, it } from "vitest";
import { formatVnd, parseVndPrice } from "./price";

describe("parseVndPrice", () => {
  it.each([
    ["35k", 35000],
    ["35K", 35000],
    ["35.000đ", 35000],
    ["35,000 VND", 35000],
    ["35.000 ₫", 35000],
    ["25", 25000],
    ["1.200.000", 1200000],
    ["1tr2", 1200000],
    ["2 triệu", 2000000],
    ["12.5k", 12500],
    ["0", 0],
  ])("%s -> %d", (raw, expected) => {
    expect(parseVndPrice(raw)).toBe(expected);
  });

  it("returns null when there is no price", () => {
    expect(parseVndPrice("")).toBeNull();
    expect(parseVndPrice("Thời giá")).toBeNull();
    expect(parseVndPrice(null)).toBeNull();
  });

  it("accepts numbers", () => {
    expect(parseVndPrice(45000)).toBe(45000);
    expect(parseVndPrice(45)).toBe(45000);
  });
});

describe("formatVnd", () => {
  it("formats with Vietnamese separators", () => {
    expect(formatVnd(35000)).toBe("35.000đ");
    expect(formatVnd(null)).toBe("");
  });
});
