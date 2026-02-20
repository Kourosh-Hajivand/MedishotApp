import { MAGIC_API_SETTINGS } from "@/components/ImageEditor/ToolMagic";
import axios from "axios";

const MAGIC_API_URL = "https://0k6nu0kv35629q-5000.proxy.runpod.net/generate";
const MAGIC_REQUEST_TIMEOUT_MS = 180000;

/** پاسخ خام API پردازش دندان */
export interface MagicGenerateApiResponse {
    status: string;
    images?: Record<string, string>;
    message?: string;
}

/** پارامترهای درخواست (برای تایپ‌سازی) */
export interface MagicGenerateRequest {
    type: "teeth";
    image: string;
    settings: typeof MAGIC_API_SETTINGS;
}

/**
 * ارسال تصویر به API Magic و دریافت تصاویر پردازش‌شده.
 * خطاها داخل سرویس هندل می‌شوند و به صورت Error پرتاب می‌شوند.
 */
export async function magicGenerate(
    imageBase64: string,
    settings: typeof MAGIC_API_SETTINGS = MAGIC_API_SETTINGS
): Promise<Record<string, string>> {
    const requestBody: MagicGenerateRequest = {
        type: "teeth",
        image: imageBase64,
        settings,
    };

    try {
        const { data } = await axios.post<MagicGenerateApiResponse>(MAGIC_API_URL, requestBody, {
            headers: { "Content-Type": "application/json" },
            timeout: MAGIC_REQUEST_TIMEOUT_MS,
        });

        if (data?.status !== "success") {
            throw new Error(data?.message ?? "API did not return success");
        }

        const images = data.images ?? (data as unknown as Record<string, string>);
        return images;
    } catch (error) {
        if (axios.isAxiosError(error)) {
            const message =
                error.response?.data?.message ??
                error.message ??
                "Magic API request failed";
            throw new Error(message);
        }
        throw error;
    }
}
