/**
 * External Face Align API (Hugging Face Space).
 * POST multipart/form-data: ref_image (before), cur_image (after).
 * Returns aligned "after" image for comparison.
 */

import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const ALIGN_API_URL = "https://4lir324-mfa.hf.space/api/align";
const ALIGN_API_TOKEN = "Bearer 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";

export interface AlignApiResponse {
    beforeCropped?: string;
    afterAlignedCropped?: string;
}

export type AlignApiResult =
    | { success: true; afterAlignedCropped: string }
    | { success: false; error: string };

const LOG_TAG = "[AlignAPI]";

const isReactNative = typeof Platform !== "undefined" && Platform.OS !== "web";

/**
 * Build FormData with ref_image (before) and cur_image (after).
 * RN: download to cache and use { uri, name, type }. Web: fetch as Blob.
 */
async function buildAlignFormData(beforeUrl: string, afterUrl: string): Promise<FormData> {
    const formData = new FormData();
    if (isReactNative) {
        const beforeUri = `${FileSystem.cacheDirectory}align_before_${Date.now()}.jpg`;
        const afterUri = `${FileSystem.cacheDirectory}align_after_${Date.now()}.jpg`;
        console.log(`${LOG_TAG} downloading before`, beforeUrl);
        console.log(`${LOG_TAG} downloading after`, afterUrl);
        const [beforeRes, afterRes] = await Promise.all([
            FileSystem.downloadAsync(beforeUrl, beforeUri),
            FileSystem.downloadAsync(afterUrl, afterUri),
        ]);
        console.log(`${LOG_TAG} download result`, { beforeStatus: beforeRes.status, afterStatus: afterRes.status, beforeUri, afterUri });
        if (beforeRes.status !== 200 || afterRes.status !== 200) {
            throw new Error(`Failed to download images: before=${beforeRes.status} after=${afterRes.status}`);
        }
        (formData as any).append("ref_image", { uri: beforeUri, name: "before.jpg", type: "image/jpeg" });
        (formData as any).append("cur_image", { uri: afterUri, name: "after.jpg", type: "image/jpeg" });
        console.log(`${LOG_TAG} FormData built, posting to API`);
    } else {
        const [beforeRes, afterRes] = await Promise.all([fetch(beforeUrl), fetch(afterUrl)]);
        if (!beforeRes.ok || !afterRes.ok) throw new Error("Failed to fetch images");
        const [beforeBlob, afterBlob] = await Promise.all([beforeRes.blob(), afterRes.blob()]);
        (formData as any).append("ref_image", beforeBlob, "before.jpg");
        (formData as any).append("cur_image", afterBlob, "after.jpg");
    }
    return formData;
}

/**
 * Calls align API with before (ref) and after (cur) image URLs.
 * Returns data URL of aligned "after" image, or error on failure.
 */
export async function alignImages(beforeUrl: string, afterUrl: string): Promise<AlignApiResult> {
    const logPayload = { beforeUrl: beforeUrl?.slice?.(0, 60) + "...", afterUrl: afterUrl?.slice?.(0, 60) + "..." };
    console.log(`${LOG_TAG} request start`, logPayload);

    try {
        const formData = await buildAlignFormData(beforeUrl, afterUrl);

        const res = await fetch(ALIGN_API_URL, {
            method: "POST",
            headers: {
                Authorization: ALIGN_API_TOKEN,
            },
            body: formData,
        });

        const raw = await res.text();
        console.log(`${LOG_TAG} response status=${res.status}`, { bodyLength: raw?.length, bodyPreview: raw?.slice?.(0, 120) });

        if (!res.ok) {
            console.warn(`${LOG_TAG} request failed`, { status: res.status, body: raw?.slice?.(0, 200) });
            return { success: false, error: `HTTP ${res.status}: ${raw?.slice(0, 100)}` };
        }

        let data: AlignApiResponse;
        try {
            data = JSON.parse(raw) as AlignApiResponse;
        } catch {
            console.warn(`${LOG_TAG} invalid JSON`, { raw: raw?.slice(0, 200) });
            return { success: false, error: "Invalid JSON response" };
        }

        const afterAligned = data?.afterAlignedCropped;
        if (!afterAligned || typeof afterAligned !== "string") {
            console.warn(`${LOG_TAG} missing afterAlignedCropped`, { keys: data ? Object.keys(data) : [] });
            return { success: false, error: "Missing afterAlignedCropped in response" };
        }

        console.log(`${LOG_TAG} success`, { afterAlignedLength: afterAligned.length });
        return { success: true, afterAlignedCropped: afterAligned };
    } catch (e) {
        const err = e instanceof Error ? e.message : String(e);
        console.warn(`${LOG_TAG} error`, { error: err, ...logPayload });
        return { success: false, error: err };
    }
}
