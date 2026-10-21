// Choices shown in the admin UI and validated in server actions. Kept apart from ai.ts, which is server-only.

export const STUDIO_PRESETS = {
  white: { label: "Nền trắng e-commerce", prompt: "a seamless pure white e-commerce backdrop, soft even studio lighting, a subtle natural shadow under the product" },
  wood: { label: "Bàn gỗ quán cafe", prompt: "a rustic wooden café table, warm natural morning light from a window, a softly blurred cozy café interior behind" },
  pastel: { label: "Studio pastel", prompt: "a smooth pastel studio backdrop with a gentle gradient, soft diffused lighting, a minimal clean composition" },
  marble: { label: "Mặt đá marble", prompt: "an elegant white marble surface, soft daylight, a softly blurred neutral background" },
} as const;
export type StudioPreset = keyof typeof STUDIO_PRESETS;

// Used both by the API call and by the "copy prompt" button for the Gemini app.
// The model redraws the whole image, so the prompt insists on leaving the product untouched.
export function studioPrompt(preset: StudioPreset): string {
  return `This is a product photo taken with a phone by a small shop owner.
Turn it into a professional, studio-quality product photo.
STRICT RULES:
- Keep the product itself EXACTLY as in the original: same shape, proportions, colors, textures, portion size, garnish, printed text and logos. Do not add, remove, beautify or redesign any part of the product.
- Remove the original background, clutter and hands. If a garment hangs on a hanger, the hanger may stay.
- Place the product on ${STUDIO_PRESETS[preset].prompt}.
- Product centered and fully visible, realistic perspective and contact shadow, sharp focus.
- No added text, watermark, people, or extra props that could be mistaken for part of the product.`;
}

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
