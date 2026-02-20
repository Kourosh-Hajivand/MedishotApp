import { MAGIC_API_SETTINGS } from "@/components/ImageEditor/ToolMagic";
import { magicGenerate } from "@/utils/service/MagicService";
import { useMutation, UseMutationResult } from "@tanstack/react-query";

export interface MagicGenerateMutationVariables {
    imageBase64: string;
    signal?: AbortSignal;
}

/**
 * Mutation برای ارسال تصویر به API Magic و دریافت تصاویر پردازش‌شده.
 * با ارسال signal می‌توان درخواست را لغو کرد (مثلاً از AbortController).
 * خروجی: Record<string, string> (data.images)
 */
export function useMagicGenerateMutation(): UseMutationResult<
    Record<string, string>,
    Error,
    MagicGenerateMutationVariables
> {
    return useMutation({
        mutationFn: ({ imageBase64, signal }: MagicGenerateMutationVariables) =>
            magicGenerate(imageBase64, MAGIC_API_SETTINGS, signal),
    });
}
