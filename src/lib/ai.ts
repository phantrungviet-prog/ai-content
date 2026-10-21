import "server-only";
import { ApiError, GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import type { MenuDraft } from "@/lib/menu";
import { parseVndPrice } from "@/lib/price";
import { STUDIO_PRESETS, TONES, type AspectRatio, type Platform, type StudioPreset, type Tone } from "@/lib/ai-options";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY trong .env.local");
  return new GoogleGenAI({ apiKey });
}

const RETRY_DELAYS_MS = [1500, 4000];

// Calls Gemini, retrying overloads (503/500) that Google says are usually temporary,
// and turns API errors into messages the admin can act on.
async function generate(params: GenerateContentParameters) {
  for (let attempt = 0; ; attempt++) {
    try {
      return await client().models.generateContent(params);
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0;
      if ((status === 503 || status === 500) && attempt < RETRY_DELAYS_MS.length) {
        await new Promise((resolve) => setTimeout(resolve, RETRY_DELAYS_MS[attempt]));
        continue;
      }
      console.error("Gemini call failed", { model: params.model, status, err });
      throw new Error(friendlyError(status, err instanceof Error ? err.message : ""));
    }
  }
}

function friendlyError(status: number, message: string): string {
  if (status === 503 || status === 500) return "Máy chủ AI của Google đang quá tải. Vui lòng thử lại sau ít phút.";
  if (status === 429 && /free_tier|limit: 0\b/.test(message))
    return "Tài khoản Gemini chưa được phép dùng tính năng này ở gói miễn phí. Hãy bật Billing trong Google AI Studio.";
  if (status === 429) return "Đã vượt giới hạn số lần gọi AI. Vui lòng đợi một lát rồi thử lại.";
  if (status === 400 && /api key/i.test(message)) return "GEMINI_API_KEY không hợp lệ. Kiểm tra lại key trong .env.local.";
  if (status === 404) return "Không tìm thấy model AI. Kiểm tra GEMINI_MODEL / GEMINI_IMAGE_MODEL trong .env.local.";
  return "Gọi AI thất bại. Vui lòng thử lại.";
}

// Prices are returned verbatim and normalized by parseVndPrice, which is tested, instead of trusting the model's arithmetic.
const extractedMenuSchema = z.object({
  title: z.string().describe("Tên quán hoặc tiêu đề menu nếu có, ngược lại chuỗi rỗng"),
  categories: z.array(
    z.object({
      name: z.string().describe("Tên danh mục, ví dụ 'Cà phê', 'Món chính'. Dùng 'Khác' nếu menu không chia danh mục"),
      items: z.array(
        z.object({
          name: z.string(),
          description: z.string().describe("Mô tả in trên menu, chuỗi rỗng nếu không có"),
          price_text: z.string().describe("Giá đúng như in trên menu, ví dụ '35k', '35.000'. Chuỗi rỗng nếu không có"),
          variants: z
            .array(z.object({ label: z.string(), price_text: z.string() }))
            .describe("Các size/lựa chọn có giá riêng, ví dụ M/L, Nóng/Đá. Mảng rỗng nếu chỉ có một giá"),
        }),
      ),
    }),
  ),
});

const MENU_PROMPT = `Bạn là trợ lý số hóa menu cho quán ăn/quán nước Việt Nam.
Đọc (các) ảnh menu/bảng giá và trích xuất TOÀN BỘ món theo đúng thứ tự trên menu.
- Giữ nguyên tên món tiếng Việt có dấu, sửa lỗi chính tả rõ ràng do ảnh mờ.
- Không bịa món hoặc giá không có trong ảnh.
- Nếu một món có nhiều size/giá, đặt vào variants và để price_text rỗng.
- Nhiều ảnh là các trang của cùng một menu: gộp lại, không lặp danh mục.`;

export type ImageInput = { data: Buffer; mimeType: string };

export async function extractMenuFromImages(images: ImageInput[]): Promise<MenuDraft> {
  // One retry: occasional malformed output usually succeeds on a second attempt.
  let extracted: z.infer<typeof extractedMenuSchema> | null = null;
  for (let attempt = 0; attempt < 2 && !extracted; attempt++) {
    const response = await generate({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [
            ...images.map((img) => ({ inlineData: { data: img.data.toString("base64"), mimeType: img.mimeType } })),
            { text: MENU_PROMPT },
          ],
        },
      ],
      config: {
        responseMimeType: "application/json",
        responseJsonSchema: z.toJSONSchema(extractedMenuSchema),
        temperature: 0.1,
      },
    });
    extracted = parseJson(extractedMenuSchema, response.text);
  }
  if (!extracted) throw new Error("AI trả về dữ liệu menu không hợp lệ, vui lòng thử lại");

  return {
    title: extracted.title,
    categories: extracted.categories
      .filter((c) => c.items.length > 0)
      .map((c) => ({
        name: c.name,
        items: c.items.map((item) => ({
          name: item.name,
          description: item.description,
          price: parseVndPrice(item.price_text),
          options: item.variants.map((v) => ({ label: v.label, price: parseVndPrice(v.price_text) })),
          is_available: true,
        })),
      })),
  };
}

function parseJson<T>(schema: z.ZodType<T>, text: string | undefined): T | null {
  try {
    const result = schema.safeParse(JSON.parse(text ?? ""));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// ---------- Studio product photos (Nano Banana) ----------

const IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || "gemini-3.1-flash-image";

// The model redraws the whole image, so the prompt insists on leaving the product untouched;
// an admin still approves every result before it is used.
export async function generateStudioImage(image: ImageInput, preset: StudioPreset, aspectRatio: AspectRatio): Promise<ImageInput> {
  const prompt = `This is a product photo taken with a phone by a small shop owner.
Turn it into a professional, studio-quality product photo.
STRICT RULES:
- Keep the product itself EXACTLY as in the original: same shape, proportions, colors, textures, portion size, garnish, printed text and logos. Do not add, remove, beautify or redesign any part of the product.
- Remove the original background, clutter and hands. If a garment hangs on a hanger, the hanger may stay.
- Place the product on ${STUDIO_PRESETS[preset].prompt}.
- Product centered and fully visible, realistic perspective and contact shadow, sharp focus.
- No added text, watermark, people, or extra props that could be mistaken for part of the product.`;

  const response = await generate({
    model: IMAGE_MODEL,
    contents: [{ role: "user", parts: [{ inlineData: { data: image.data.toString("base64"), mimeType: image.mimeType } }, { text: prompt }] }],
    config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
  });

  const part = response.candidates?.[0]?.content?.parts?.find((p) => p.inlineData?.data);
  if (!part?.inlineData?.data) {
    const reason = response.candidates?.[0]?.finishReason ?? response.promptFeedback?.blockReason;
    throw new Error(`AI không tạo được ảnh${reason ? ` (${reason})` : ""}, thử lại hoặc chọn nền khác`);
  }
  return { data: Buffer.from(part.inlineData.data, "base64"), mimeType: part.inlineData.mimeType ?? "image/png" };
}

// ---------- Marketing copy ----------

const PLATFORM_BRIEF: Record<Platform, string> = {
  description:
    "Viết mô tả sản phẩm cho trang web, 60–120 từ, 1–2 đoạn, nêu điểm nổi bật, chất liệu/hương vị, phù hợp với ai. Không dùng emoji, không hashtag (hashtags là mảng rỗng).",
  facebook:
    "Viết bài đăng Facebook bán hàng: câu mở đầu gây chú ý, 3–5 đoạn ngắn, emoji vừa phải, nêu giá nếu có, kết bằng lời kêu gọi (inbox/gọi/ghé quán) kèm số điện thoại/địa chỉ nếu có. 5–8 hashtag tiếng Việt không dấu liên quan.",
  tiktok:
    "Viết caption TikTok ngắn dưới 150 ký tự, bắt tai, có emoji. 4–6 hashtag (có thể gồm #xuhuong #foryou nếu hợp). Điền video_idea: gợi ý quay video 15–30 giây gồm 3 cảnh ngắn.",
};

const postSchema = z.object({
  body: z.string(),
  hashtags: z.array(z.string()).describe("Hashtag, mỗi phần tử bắt đầu bằng #"),
  video_idea: z.string().describe("Chỉ cho TikTok, ngược lại chuỗi rỗng"),
});
export type GeneratedPost = z.infer<typeof postSchema>;

export async function generatePost(
  input: {
    shopName: string;
    shopType: "shop" | "restaurant";
    phone: string | null;
    address: string | null;
    productName: string;
    price: string;
    notes: string;
    platform: Platform;
    tone: Tone;
  },
  image?: ImageInput,
): Promise<GeneratedPost> {
  const prompt = `Bạn là copywriter cho ${input.shopType === "shop" ? "shop bán hàng online" : "quán ăn/quán nước"} tại Việt Nam.
${PLATFORM_BRIEF[input.platform]}
Giọng văn: ${TONES[input.tone]}.
Thông tin:
- Tên ${input.shopType === "shop" ? "shop" : "quán"}: ${input.shopName}
- Sản phẩm: ${input.productName}
- Giá: ${input.price || "không nêu"}
- Ghi chú của chủ shop: ${input.notes || "không có"}
- Điện thoại: ${input.phone || "không có"}
- Địa chỉ: ${input.address || "không có"}
Chỉ dùng thông tin trên và những gì thấy rõ trong ảnh; không bịa khuyến mãi, chứng nhận hay cam kết. Viết tiếng Việt có dấu.`;

  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await generate({
      model: MODEL,
      contents: [
        {
          role: "user",
          parts: [...(image ? [{ inlineData: { data: image.data.toString("base64"), mimeType: image.mimeType } }] : []), { text: prompt }],
        },
      ],
      config: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(postSchema), temperature: 0.9 },
    });
    const post = parseJson(postSchema, response.text);
    if (post) return { ...post, hashtags: post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)) };
  }
  throw new Error("AI trả về nội dung không hợp lệ, vui lòng thử lại");
}
