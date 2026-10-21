import "server-only";
import { GoogleGenAI } from "@google/genai";
import { z } from "zod";
import type { MenuDraft } from "@/lib/menu";
import { parseVndPrice } from "@/lib/price";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

function client() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Thiếu GEMINI_API_KEY trong .env.local");
  return new GoogleGenAI({ apiKey });
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
    const response = await client().models.generateContent({
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
