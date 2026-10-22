import { expect, it } from "vitest";
import { slugError, slugify } from "./slug";

it("strips Vietnamese diacritics", () => {
  expect(slugify("Quán Phở Đức")).toBe("quan-pho-duc");
  expect(slugify("  Trà Sữa @ Nhà  ")).toBe("tra-sua-nha");
});

it("rejects reserved, too short and too long slugs", () => {
  expect(slugError("admin")).toMatch(/dành riêng/);
  expect(slugError("api")).toMatch(/dành riêng/);
  expect(slugError("ab")).toMatch(/ít nhất 3/);
  expect(slugError("a".repeat(41))).toMatch(/tối đa 40/);
  expect(slugError("quan-pho-duc")).toBeNull();
  expect(slugError("admin-shop")).toBeNull();
});
