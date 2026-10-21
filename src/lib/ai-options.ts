// Choices shown in the admin UI and validated in server actions. Kept apart from ai.ts, which is server-only.

export const STUDIO_PRESETS = {
  white: { label: "Nền trắng e-commerce", prompt: "a seamless pure white e-commerce backdrop, soft even studio lighting, a subtle natural shadow under the product" },
  wood: { label: "Bàn gỗ quán cafe", prompt: "a rustic wooden café table, warm natural morning light from a window, a softly blurred cozy café interior behind" },
  pastel: { label: "Studio pastel", prompt: "a smooth pastel studio backdrop with a gentle gradient, soft diffused lighting, a minimal clean composition" },
  marble: { label: "Mặt đá marble", prompt: "an elegant white marble surface, soft daylight, a softly blurred neutral background" },
} as const;
export type StudioPreset = keyof typeof STUDIO_PRESETS;

export const ASPECT_RATIOS = ["1:1", "3:4", "9:16"] as const;
export type AspectRatio = (typeof ASPECT_RATIOS)[number];

export const PLATFORMS = {
  description: "Mô tả sản phẩm (website)",
  facebook: "Bài đăng Facebook",
  tiktok: "Caption TikTok",
} as const;
export type Platform = keyof typeof PLATFORMS;

export const TONES = {
  friendly: "Vui vẻ, thân thiện",
  premium: "Sang trọng, tinh tế",
  genz: "Trẻ trung, bắt trend Gen Z",
} as const;
export type Tone = keyof typeof TONES;
