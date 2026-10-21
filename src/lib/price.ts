// Turns a price as printed on a Vietnamese menu into whole VND.
// "35k" -> 35000, "35.000đ" -> 35000, "1tr2" -> 1200000, "25" -> 25000 (menus often drop the thousands).
// Returns null when no price can be read, so a human fixes it during review instead of us guessing.
export function parseVndPrice(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  if (typeof raw === "number") return Number.isFinite(raw) && raw >= 0 ? normalizeScale(Math.round(raw)) : null;

  const text = raw.toLowerCase().replace(/\s+/g, "");
  if (!/\d/.test(text)) return null;

  const million = text.match(/^(\d+)(?:tr|triệu)(\d*)/);
  if (million) {
    const fraction = million[2] ? Number(`0.${million[2]}`) : 0;
    return Math.round((Number(million[1]) + fraction) * 1_000_000);
  }

  const thousand = text.match(/^(\d+(?:[.,]\d+)?)k/);
  if (thousand) return Math.round(Number(thousand[1].replace(",", ".")) * 1000);

  const digits = text.match(/\d[\d.,]*/)?.[0] ?? "";
  // Dots and commas in VND prices are thousands separators ("35.000", "1,200,000").
  const value = Number(digits.replace(/[.,]/g, ""));
  return Number.isFinite(value) ? normalizeScale(value) : null;
}

function normalizeScale(value: number): number {
  return value > 0 && value < 1000 ? value * 1000 : value;
}

export function formatVnd(value: number | null | undefined): string {
  if (value == null) return "";
  return `${value.toLocaleString("vi-VN")}đ`;
}
