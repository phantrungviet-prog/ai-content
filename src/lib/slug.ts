// "Quán Phở Đức" -> "quan-pho-duc"
export function slugify(input: string): string {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// Words a shop may not take: they look like platform pages, or could be mistaken for one.
const RESERVED_SLUGS = new Set([
  "admin", "api", "app", "auth", "login", "signup", "logout", "onboarding", "account",
  "www", "mail", "static", "help", "support", "terms", "privacy", "m", "s",
]);

// Returns a Vietnamese error for a slug that is already slugified, or null when it is fine.
export function slugError(slug: string): string | null {
  if (slug.length < 3) return "Đường dẫn cần ít nhất 3 ký tự.";
  if (slug.length > 40) return "Đường dẫn tối đa 40 ký tự.";
  if (RESERVED_SLUGS.has(slug)) return `"${slug}" là từ dành riêng, chọn đường dẫn khác.`;
  return null;
}
