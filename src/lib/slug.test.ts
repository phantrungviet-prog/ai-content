import { expect, it } from "vitest";
import { slugify } from "./slug";

it("strips Vietnamese diacritics", () => {
  expect(slugify("Quán Phở Đức")).toBe("quan-pho-duc");
  expect(slugify("  Trà Sữa @ Nhà  ")).toBe("tra-sua-nha");
});
