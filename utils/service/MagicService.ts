import axios from "axios";

const MAGIC_API_URL = "https://medical-api.alipour.me/generate";
const MAGIC_REQUEST_TIMEOUT_MS = 180000;

/** Raw API response for teeth processing */
export interface MagicGenerateApiResponse {
    status: string;
    images?: Record<string, string>;
    message?: string;
}

/** Request parameters (for typing) */
export interface MagicGenerateRequest {
    type: "teeth";
    image: string;
}

/**
 * Send image to Magic API and receive processed images.
 * By sending a signal, the request can be canceled with AbortController.
 * Errors are handled inside the service and thrown as Error.
 */
export async function magicGenerate(imageBase64: string, signal?: AbortSignal): Promise<Record<string, string>> {
    const requestBody: MagicGenerateRequest = {
        type: "teeth",
        image: imageBase64,
    };

    try {
        const { data } = await axios.post<MagicGenerateApiResponse>(MAGIC_API_URL, requestBody, {
            headers: { "Content-Type": "application/json" },
            timeout: MAGIC_REQUEST_TIMEOUT_MS,
            signal,
        });

        if (data?.status !== "success") {
            throw new Error(data?.message ?? "API did not return success");
        }

        const images = data.images ?? (data as unknown as Record<string, string>);
        return images;
    } catch (error) {
        if (axios.isAxiosError(error) && error.code === "ERR_CANCELED") {
            throw error; // Canceled by user – throw the same error
        }
        if (axios.isAxiosError(error)) {
            const message = error.response?.data?.message ?? error.message ?? "Magic API request failed";
            throw new Error(message);
        }
        throw error;
    }
}
