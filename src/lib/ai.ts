import "server-only";
import { ApiError, GoogleGenAI, type GenerateContentParameters } from "@google/genai";
import { z } from "zod";
import type { MenuDraft } from "@/lib/menu";
import { parseVndPrice } from "@/lib/price";
import { studioPrompt, TONES, type AspectRatio, type Platform, type StudioPreset, type Tone } from "@/lib/ai-options";

const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-flash";
// Free-tier models are shared with everyone and often overloaded (503) or slow, so text and vision calls
// fall back to these, in order. Comma-separated; set GEMINI_FALLBACK_MODELS="" to disable.
const FALLBACK_MODELS = (process.env.GEMINI_FALLBACK_MODELS ?? "gemini-3.6-flash,gemini-3.5-flash-lite")
  .split(",")
  .map((m) => m.trim())
  .filter((m) => m && m !== MODEL);
const TEXT_MODELS = [MODEL, ...FALLBACK_MODELS];

// A model may hang for minutes. One user request (every model and round, and a retry on malformed output)
// must end before the pages' maxDuration (300s), so the user gets a message instead of a killed request.
// Measured on a 46-item menu: the lite model needs ~45s, so one call may take up to 120s.
const CALL_TIMEOUT_MS = 120_000;
const REQUEST_BUDGET_MS = 250_000;
const requestDeadline = () => Date.now() + REQUEST_BUDGET_MS;
// Waits before trying every model again when all of them turned the request down. Google says overload
// spikes are usually short, and a 503 comes back within seconds, so another round is cheap.
const ROUND_DELAYS_MS = [5_000, 15_000, 30_000];

// A model that just failed is tried last for a while, so the next request does not wait on it again.
// This lives per server instance, which is enough to route around a model that is down right now.
const COOLDOWN_MS = 5 * 60_000;
const cooldownUntil = new Map<string, number>();
const coolingDown = (model: string) => (cooldownUntil.get(model) ?? 0) > Date.now();

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY trong .env.local");
  return new GoogleGenAI({ apiKey });
}

// Calls Gemini with the first model that answers, moving on when one is overloaded, out of quota or too slow,
// and turns API errors into messages the admin can act on.
async function generate(models: string[], params: Omit<GenerateContentParameters, "model">, deadline: number) {
  // Outside the try: a missing key must surface as is, not as a generic API failure.
  const ai = client();
  let last = { status: 0, message: "", timedOut: false };
  for (let round = 0; ; round++) {
    const ordered = [...models.filter((m) => !coolingDown(m)), ...models.filter(coolingDown)];
    for (const model of ordered) {
      const remaining = deadline - Date.now();
      if (remaining < 5_000) break;
      try {
        const response = await ai.models.generateContent({
          ...params,
          model,
          config: { ...params.config, abortSignal: AbortSignal.timeout(Math.min(CALL_TIMEOUT_MS, remaining)) },
        });
        cooldownUntil.delete(model);
        return response;
      } catch (err) {
        const status = err instanceof ApiError ? err.status : 0;
        const timedOut = err instanceof Error && (err.name === "TimeoutError" || err.name === "AbortError");
        console.error("Gemini call failed", { model, round, status, timedOut, err });
        last = { status, message: err instanceof Error ? err.message : "", timedOut };
        // Overload, slowness and quota are per model, so the next one may work; a bad key or request would not.
        if (!(timedOut || status === 503 || status === 500 || status === 429)) throw new Error(friendlyError(status, last.message, timedOut));
        cooldownUntil.set(model, Date.now() + COOLDOWN_MS);
      }
    }
    const delay = ROUND_DELAYS_MS[round];
    if (delay === undefined || deadline - Date.now() < delay + 30_000) break;
    await new Promise((resolve) => setTimeout(resolve, delay));
  }
  throw new Error(friendlyError(last.status, last.message, last.timedOut));
}

function friendlyError(status: number, message: string, timedOut: boolean): string {
  if (timedOut) return "AI của Google đang phản hồi quá chậm. Vui lòng thử lại sau ít phút.";
  if (status === 503 || status === 500) return "Máy chủ AI của Google đang quá tải. Vui lòng thử lại sau ít phút.";
  if (status === 429 && /free_tier|limit: 0\b/.test(message))
    return "Tài khoản Gemini chưa được phép dùng tính năng này ở gói miễn phí. Hãy bật Billing trong Google AI Studio.";
  if (status === 429) return "Đã vượt giới hạn số lần gọi AI. Vui lòng đợi một lát rồi thử lại.";
  if (status === 400 && /api key/i.test(message)) return "GEMINI_API_KEY không hợp lệ. Kiểm tra lại key trong .env.local.";
  if (status === 404) return "Không tìm thấy model AI. Kiểm tra GEMINI_MODEL / GEMINI_IMAGE_MODEL trong .env.local.";
  // The code (0 = no HTTP response, e.g. network error) lets the admin tell causes apart without reading logs.
  return `Gọi AI thất bại (mã ${status}). Vui lòng thử lại.`;
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
  const deadline = requestDeadline();
  for (let attempt = 0; attempt < 2 && !extracted; attempt++) {
    const response = await generate(TEXT_MODELS, {
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
    }, deadline);
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
  const prompt = studioPrompt(preset);

  const response = await generate([IMAGE_MODEL], {
    contents: [{ role: "user", parts: [{ inlineData: { data: image.data.toString("base64"), mimeType: image.mimeType } }, { text: prompt }] }],
    config: { responseModalities: ["IMAGE"], imageConfig: { aspectRatio } },
  }, requestDeadline());

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

  const deadline = requestDeadline();
  for (let attempt = 0; attempt < 2; attempt++) {
    const response = await generate(TEXT_MODELS, {
      contents: [
        {
          role: "user",
          parts: [...(image ? [{ inlineData: { data: image.data.toString("base64"), mimeType: image.mimeType } }] : []), { text: prompt }],
        },
      ],
      config: { responseMimeType: "application/json", responseJsonSchema: z.toJSONSchema(postSchema), temperature: 0.9 },
    }, deadline);
    const post = parseJson(postSchema, response.text);
    if (post) return { ...post, hashtags: post.hashtags.map((h) => (h.startsWith("#") ? h : `#${h}`)) };
  }
  throw new Error("AI trả về nội dung không hợp lệ, vui lòng thử lại");
}
